# Beat Runtime Benchmark Report

Generated: 2026-04-11T01:45:15.479Z

### Binding Micro Costs

Fastest median path: **bindText update** at **250 ns/op**.

| Benchmark | Median | Mean | RSD | Samples | Ops/Sample | Base Ops | Compared With Fastest |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bindText update | 250 ns/op | 249 ns/op | 1.5% | 5 | 80,000 | 10,000 | fastest |
| bindProperty input and checkbox update | 924 ns/op | 969 ns/op | 7.3% | 5 | 10,000 | 10,000 | 3.70x slower |
| jsx pulse property bindings | 0.001 ms/op | 0.001 ms/op | 4.5% | 5 | 10,000 | 10,000 | 4.36x slower |
| bindFields market leaf field updates | 0.002 ms/op | 0.002 ms/op | 3.7% | 5 | 10,000 | 10,000 | 8.93x slower |
| bindFields market leaf field updates in batch | 0.003 ms/op | 0.003 ms/op | 5.0% | 5 | 10,000 | 10,000 | 12.92x slower |
| bindFields market row replace | 0.003 ms/op | 0.003 ms/op | 3.1% | 5 | 10,000 | 10,000 | 13.02x slower |
| bindFields market row replace in batch | 0.003 ms/op | 0.003 ms/op | 1.8% | 5 | 10,000 | 10,000 | 13.97x slower |

### Mounted Row Binder Costs

| Benchmark | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| exact-masked row binder 10000-row batched sweep | 475.450 ms/op | 475.257 ms/op | 1.5% | 5 | 10 | 10 |