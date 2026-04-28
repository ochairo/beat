import { resolve } from "node:path";
import ts from "typescript";
import type { PluginOption, UserConfig } from "vite";

export interface CreateBeatVitePluginOptions {
  readonly packageRoot?: string;
  readonly packageName?: string;
  readonly aliasLocalSource?: boolean;
}

function isIntrinsicElementTag(
  tagName: ts.JsxTagNameExpression,
): tagName is ts.Identifier {
  return ts.isIdentifier(tagName) && /^[a-z]/.test(tagName.text);
}

function jsxAttributeInitializerToExpression(
  initializer: ts.JsxAttribute["initializer"],
): ts.Expression {
  if (!initializer) {
    return ts.factory.createTrue();
  }

  if (ts.isStringLiteral(initializer)) {
    return initializer;
  }

  if (ts.isJsxExpression(initializer)) {
    return initializer.expression ?? ts.factory.createTrue();
  }

  return ts.factory.createTrue();
}

function createExpressionAttribute(
  name: string,
  expression: ts.Expression,
): ts.JsxAttribute {
  return ts.factory.createJsxAttribute(
    ts.factory.createIdentifier(name),
    ts.factory.createJsxExpression(undefined, expression),
  );
}

function transformIntrinsicAttributes(
  attributes: ts.JsxAttributes,
): ts.JsxAttributes {
  const nextProperties: ts.JsxAttributeLike[] = [];
  const classBindings: ts.ObjectLiteralElementLike[] = [];
  const styleBindings: ts.ObjectLiteralElementLike[] = [];
  const propertyBindings: ts.ObjectLiteralElementLike[] = [];
  let textBinding: ts.Expression | undefined;
  let changed = false;

  for (const attribute of attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) {
      nextProperties.push(attribute);
      continue;
    }

    if (ts.isJsxNamespacedName(attribute.name)) {
      const bindingName = attribute.name.name.text;
      const bindingValue = jsxAttributeInitializerToExpression(
        attribute.initializer,
      );

      if (attribute.name.namespace.text === "class") {
        classBindings.push(
          ts.factory.createPropertyAssignment(bindingName, bindingValue),
        );
        changed = true;
        continue;
      }

      if (attribute.name.namespace.text === "style") {
        styleBindings.push(
          ts.factory.createPropertyAssignment(
            /[^a-zA-Z0-9_$]/.test(bindingName)
              ? ts.factory.createStringLiteral(bindingName)
              : bindingName,
            bindingValue,
          ),
        );
        changed = true;
        continue;
      }

      if (attribute.name.namespace.text === "prop") {
        propertyBindings.push(
          ts.factory.createPropertyAssignment(bindingName, bindingValue),
        );
        changed = true;
        continue;
      }
    }

    if (ts.isIdentifier(attribute.name) && attribute.name.text === "text") {
      textBinding = jsxAttributeInitializerToExpression(attribute.initializer);
      changed = true;
      continue;
    }

    nextProperties.push(attribute);
  }

  if (!changed) {
    return attributes;
  }

  if (textBinding !== undefined) {
    nextProperties.push(createExpressionAttribute("__beatText", textBinding));
  }

  if (classBindings.length > 0) {
    nextProperties.push(
      createExpressionAttribute(
        "__beatClassBindings",
        ts.factory.createObjectLiteralExpression(classBindings, true),
      ),
    );
  }

  if (styleBindings.length > 0) {
    nextProperties.push(
      createExpressionAttribute(
        "__beatStyleBindings",
        ts.factory.createObjectLiteralExpression(styleBindings, true),
      ),
    );
  }

  if (propertyBindings.length > 0) {
    nextProperties.push(
      createExpressionAttribute(
        "__beatPropertyBindings",
        ts.factory.createObjectLiteralExpression(propertyBindings, true),
      ),
    );
  }

  return ts.factory.createJsxAttributes(nextProperties);
}

function hasIntrinsicTextBinding(attributes: ts.JsxAttributes): boolean {
  return attributes.properties.some((attribute) => {
    if (ts.isJsxSpreadAttribute(attribute)) {
      return false;
    }

    return (
      ts.isIdentifier(attribute.name) &&
      (attribute.name.text === "text" || attribute.name.text === "__beatText")
    );
  });
}

function createIntrinsicChildTextBinding(
  attributes: ts.JsxAttributes,
  children: readonly ts.JsxChild[],
):
  | { attributes: ts.JsxAttributes; children: ts.NodeArray<ts.JsxChild> }
  | undefined {
  if (hasIntrinsicTextBinding(attributes)) {
    return undefined;
  }

  const expressions = children
    .map((child) => jsxChildToExpression(child))
    .filter(
      (expression): expression is ts.Expression => expression !== undefined,
    );

  if (expressions.length !== 1) {
    return undefined;
  }

  const singleExpression = expressions[0];
  if (singleExpression === undefined) {
    return undefined;
  }

  return {
    attributes: ts.factory.createJsxAttributes([
      ...attributes.properties,
      createExpressionAttribute("__beatText", singleExpression),
    ]),
    children: ts.factory.createNodeArray(),
  };
}

function jsxChildToExpression(child: ts.JsxChild): ts.Expression | undefined {
  if (ts.isJsxText(child)) {
    const value = child.getText().replace(/\s+/g, " ").trim();
    return value === "" ? undefined : ts.factory.createStringLiteral(value);
  }

  if (ts.isJsxExpression(child)) {
    return child.expression ?? undefined;
  }

  if (
    ts.isJsxElement(child) ||
    ts.isJsxSelfClosingElement(child) ||
    ts.isJsxFragment(child)
  ) {
    return child;
  }

  return undefined;
}

function createBeatControlFlowTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const visit: ts.Visitor = (node) => {
      if (
        ts.isJsxElement(node) &&
        isIntrinsicElementTag(node.openingElement.tagName)
      ) {
        let nextAttributes = transformIntrinsicAttributes(
          node.openingElement.attributes,
        );
        let nextChildren = node.children;
        const loweredChildBinding = createIntrinsicChildTextBinding(
          nextAttributes,
          node.children,
        );

        if (loweredChildBinding) {
          nextAttributes = loweredChildBinding.attributes;
          nextChildren = loweredChildBinding.children;
        }

        if (
          nextAttributes !== node.openingElement.attributes ||
          nextChildren !== node.children
        ) {
          return ts.visitEachChild(
            ts.factory.updateJsxElement(
              node,
              ts.factory.updateJsxOpeningElement(
                node.openingElement,
                node.openingElement.tagName,
                node.openingElement.typeArguments,
                nextAttributes,
              ),
              nextChildren,
              node.closingElement,
            ),
            visit,
            context,
          );
        }
      }

      if (
        ts.isJsxSelfClosingElement(node) &&
        isIntrinsicElementTag(node.tagName)
      ) {
        const nextAttributes = transformIntrinsicAttributes(node.attributes);

        if (nextAttributes !== node.attributes) {
          return ts.factory.updateJsxSelfClosingElement(
            node,
            node.tagName,
            node.typeArguments,
            nextAttributes,
          );
        }
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (sourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
  };
}

export function transformBeatControlFlow(
  code: string,
  id: string,
): string | undefined {
  if (
    !/\.[cm]?[jt]sx$/.test(id) ||
    !/(\btext=|\b(?:class|style|prop):|<[a-z][^>]*>\s*\{)/.test(code)
  ) {
    return undefined;
  }

  const result = ts.transpileModule(code, {
    fileName: id,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
    },
    transformers: {
      before: [createBeatControlFlowTransformer()],
    },
  });

  return result.outputText === code ? undefined : result.outputText;
}

export function createBeatVitePlugin(
  options: CreateBeatVitePluginOptions = {},
): PluginOption {
  const packageName = options.packageName ?? "@ochairo/beat";
  const packageRoot = options.packageRoot;
  const alias =
    options.aliasLocalSource === false || packageRoot === undefined
      ? undefined
      : [
          {
            find: `${packageName}/jsx-dev-runtime`,
            replacement: resolve(packageRoot, "src/jsx-dev-runtime.ts"),
          },
          {
            find: `${packageName}/jsx-runtime`,
            replacement: resolve(packageRoot, "src/jsx-runtime.ts"),
          },
          {
            find: packageName,
            replacement: resolve(packageRoot, "src/index.ts"),
          },
        ];

  return {
    name: "beat:vite",
    enforce: "pre",
    config(): UserConfig {
      return {
        esbuild: {
          jsx: "automatic",
          jsxImportSource: packageName,
        },
        ...(alias === undefined
          ? {}
          : {
              resolve: {
                alias,
              },
            }),
      };
    },
    transform(code, id) {
      const transformed = transformBeatControlFlow(code, id);
      if (!transformed) {
        return null;
      }

      return {
        code: transformed,
        map: null,
      };
    },
  };
}
