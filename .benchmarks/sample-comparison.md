# Beat Sample Benchmark Report

Generated: 2026-04-11T01:45:56.586Z

### First-Row Change Write Burst

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 0.22 ms | 0.14 ms | 0.12 ms | Solid | 1.83x slower |
| Cards | 0.14 ms | 0.14 ms | 0.18 ms | React | 1.00x slower |
| Editor | 0.14 ms | 0.12 ms | 0.18 ms | React | 1.17x slower |

### Batched Sweep Write Burst

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 23.56 ms | 23.34 ms | 23.06 ms | Solid | 1.02x slower |
| Cards | 23.96 ms | 20.88 ms | 24.36 ms | React | 1.15x slower |
| Editor | 25.00 ms | 24.86 ms | 25.02 ms | React | 1.01x slower |

### Write Storm Write Burst

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 29.84 ms | 29.94 ms | 30.20 ms | Beat | fastest |
| Cards | 27.96 ms | 27.32 ms | 28.10 ms | React | 1.02x slower |
| Editor | 29.44 ms | 29.42 ms | 29.94 ms | React | 1.00x slower |

### Focus Shift Write Burst

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 0.14 ms | 0.16 ms | 0.16 ms | Beat | fastest |
| Cards | 0.18 ms | 0.22 ms | 0.16 ms | Solid | 1.13x slower |
| Editor | 0.16 ms | 0.16 ms | 0.16 ms | Beat | fastest |

### Batched Sweep Total Time

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 45.16 ms | 39.86 ms | 39.38 ms | Solid | 1.15x slower |
| Cards | 36.66 ms | 33.12 ms | 38.18 ms | React | 1.11x slower |
| Editor | 36.72 ms | 36.38 ms | 36.98 ms | React | 1.01x slower |

### First-Row Change Total Time

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 23.62 ms | 22.70 ms | 26.50 ms | React | 1.04x slower |
| Cards | 27.40 ms | 26.42 ms | 19.40 ms | Solid | 1.41x slower |
| Editor | 19.18 ms | 21.90 ms | 18.94 ms | Solid | 1.01x slower |

### Write Storm Total Time

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 51.74 ms | 52.82 ms | 50.26 ms | Solid | 1.03x slower |
| Cards | 39.52 ms | 39.68 ms | 40.58 ms | Beat | fastest |
| Editor | 36.10 ms | 35.90 ms | 36.70 ms | React | 1.01x slower |

### Focus Shift Total Time

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 31.64 ms | 26.88 ms | 24.42 ms | Solid | 1.30x slower |
| Cards | 10.10 ms | 18.90 ms | 16.14 ms | Beat | fastest |
| Editor | 17.46 ms | 19.10 ms | 11.04 ms | Solid | 1.58x slower |

### Plain-English Read

This sample report now separates responsiveness from completion:

#### Responsiveness

- Using synchronous write burst, Beat wins 3 of the 12 current sample scenarios in this snapshot.
- Beat is currently strongest on focus shift, where it leads 2 of the 3 surfaces in this snapshot.
- The largest remaining gap is first row change on the table surface, where Beat is 1.83x slower than Solid.

#### Completion

- Using total interaction time, Beat wins 2 of the 12 current sample scenarios in this snapshot.
- Beat is currently strongest on write storm, where it leads 1 of the 3 surfaces in this snapshot.
- The largest remaining gap is focus shift on the editor surface, where Beat is 1.58x slower than Solid.
- This block is now generated from the same Playwright run instead of being maintained manually, so the docs stay aligned with the actual benchmark output.