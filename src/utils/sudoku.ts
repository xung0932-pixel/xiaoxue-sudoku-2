/**
 * Sudoku logic based on the classic 9x9 backtracking algorithm
 * (trananhtuat/javascript-sudoku engine)
 */

export type Grid = number[][];

export interface CellCoord {
  row: number;
  col: number;
}

export interface DugCell {
  row: number;
  col: number;
  value: number;
}

export interface SudokuPuzzle {
  levelId: number;
  solution: Grid;
  initialPuzzle: Grid;
  dugCells: DugCell[];
  batches: DugCell[][]; // 3 batches for the heavenly tribulation
}

export const GRID_SIZE = 9;
export const BOX_SIZE = 3;

export function newGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

export function copyGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

export function isRowSafe(grid: Grid, row: number, val: number): boolean {
  for (let c = 0; c < GRID_SIZE; c++) {
    if (grid[row][c] === val) return false;
  }
  return true;
}

export function isColSafe(grid: Grid, col: number, val: number): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r][col] === val) return false;
  }
  return true;
}

export function isBoxSafe(grid: Grid, boxRow: number, boxCol: number, val: number): boolean {
  const startRow = boxRow - (boxRow % BOX_SIZE);
  const startCol = boxCol - (boxCol % BOX_SIZE);
  for (let r = 0; r < BOX_SIZE; r++) {
    for (let c = 0; c < BOX_SIZE; c++) {
      if (grid[r + startRow][c + startCol] === val) return false;
    }
  }
  return true;
}

export function isSafe(grid: Grid, row: number, col: number, val: number): boolean {
  return (
    isRowSafe(grid, row, val) &&
    isColSafe(grid, col, val) &&
    isBoxSafe(grid, row, col, val)
  );
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function fillBox(grid: Grid, row: number, col: number): void {
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let idx = 0;
  for (let r = 0; r < BOX_SIZE; r++) {
    for (let c = 0; c < BOX_SIZE; c++) {
      grid[row + r][col + c] = nums[idx++];
    }
  }
}

// Solve / Fill remaining with backtracking
export function solveSudoku(grid: Grid): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isSafe(grid, r, c, num)) {
            grid[r][c] = num;
            if (solveSudoku(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// Generate complete valid 9x9 board
export function generateFullSudoku(): Grid {
  const grid = newGrid();
  // Fill diagonal 3x3 boxes first (independent of each other)
  for (let i = 0; i < GRID_SIZE; i += BOX_SIZE) {
    fillBox(grid, i, i);
  }
  // Backtrack to solve the rest
  solveSudoku(grid);
  return grid;
}

// Generate puzzle for specific level
export function generatePuzzleForLevel(levelId: number, givenCount: number = 36): SudokuPuzzle {
  const solution = generateFullSudoku();
  const initial = copyGrid(solution);

  // Determine positions to dig out
  const allPositions: CellCoord[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      allPositions.push({ row: r, col: c });
    }
  }

  const shuffledPositions = shuffle(allPositions);
  const targetRemove = Math.min(81 - givenCount, 81 - 20); // ensure reasonable bounds
  const dugCells: DugCell[] = [];

  for (let i = 0; i < targetRemove; i++) {
    const { row, col } = shuffledPositions[i];
    const val = initial[row][col];
    initial[row][col] = 0;
    dugCells.push({ row, col, value: val });
  }

  // Split dugCells into 3 even batches for the 3 waves of Heavenly Tribulation
  const batchSize = Math.ceil(dugCells.length / 3);
  const batch1 = dugCells.slice(0, batchSize);
  const batch2 = dugCells.slice(batchSize, batchSize * 2);
  const batch3 = dugCells.slice(batchSize * 2);

  return {
    levelId,
    solution,
    initialPuzzle: initial,
    dugCells,
    batches: [batch1, batch2, batch3],
  };
}

// Check if entire board is correctly filled
export function checkWin(grid: Grid, solution: Grid): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0 || grid[r][c] !== solution[r][c]) {
        return false;
      }
    }
  }
  return true;
}

// Check cell conflicts with others in current grid
export function getCellConflicts(grid: Grid, row: number, col: number): boolean {
  const val = grid[row][col];
  if (val === 0) return false;

  // Check row
  for (let c = 0; c < GRID_SIZE; c++) {
    if (c !== col && grid[row][c] === val) return true;
  }
  // Check col
  for (let r = 0; r < GRID_SIZE; r++) {
    if (r !== row && grid[r][col] === val) return true;
  }
  // Check box
  const startRow = row - (row % BOX_SIZE);
  const startCol = col - (col % BOX_SIZE);
  for (let r = 0; r < BOX_SIZE; r++) {
    for (let c = 0; c < BOX_SIZE; c++) {
      const cr = startRow + r;
      const cc = startCol + c;
      if ((cr !== row || cc !== col) && grid[cr][cc] === val) {
        return true;
      }
    }
  }
  return false;
}
