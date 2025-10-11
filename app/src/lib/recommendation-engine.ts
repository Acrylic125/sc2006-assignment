// Super simple linear model for recommendation.

function mat_mul(a: number[][], b: number[][]): number[][] {
  return a.map((row) =>
    row.map((_, i) => row.reduce((acc, val, j) => acc + val * b[j][i], 0))
  );
}

function mat_add(a: number[][], b: number[][]): number[][] {
  return a.map((row, i) => row.map((val, j) => val + b[i][j]));
}

function mat_mult_c(a: number[][], c: number): number[][] {
  return a.map((row) => row.map((val) => val * c));
}
