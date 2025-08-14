import type { GameBoard } from "@/types"

export function createEmptyBoard(): GameBoard {
  return Array(4)
    .fill(null)
    .map(() => Array(4).fill(null))
}

export function addRandomTile(board: GameBoard): GameBoard {
  const newBoard = board.map((row) => [...row])
  const emptyCells: [number, number][] = []

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (newBoard[i][j] === null) {
        emptyCells.push([i, j])
      }
    }
  }

  if (emptyCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length)
    const [row, col] = emptyCells[randomIndex]
    newBoard[row][col] = Math.random() < 0.9 ? 2 : 4
  }

  return newBoard
}

export function initializeBoard(): GameBoard {
  let board = createEmptyBoard()
  board = addRandomTile(board)
  board = addRandomTile(board)
  return board
}

export function moveLeft(board: GameBoard): { board: GameBoard; score: number; moved: boolean } {
  const newBoard = board.map((row) => [...row])
  let totalScore = 0
  let moved = false

  for (let i = 0; i < 4; i++) {
    const row = newBoard[i].filter((cell) => cell !== null)
    const mergedRow: (number | null)[] = []
    let j = 0

    while (j < row.length) {
      if (j < row.length - 1 && row[j] === row[j + 1]) {
        const mergedValue = (row[j] as number) * 2
        mergedRow.push(mergedValue)
        totalScore += mergedValue
        j += 2
      } else {
        mergedRow.push(row[j])
        j++
      }
    }

    while (mergedRow.length < 4) {
      mergedRow.push(null)
    }

    for (let k = 0; k < 4; k++) {
      if (newBoard[i][k] !== mergedRow[k]) {
        moved = true
      }
      newBoard[i][k] = mergedRow[k]
    }
  }

  return { board: newBoard, score: totalScore, moved }
}

export function moveRight(board: GameBoard): { board: GameBoard; score: number; moved: boolean } {
  const reversedBoard = board.map((row) => [...row].reverse())
  const result = moveLeft(reversedBoard)
  return {
    ...result,
    board: result.board.map((row) => [...row].reverse()),
  }
}

export function moveUp(board: GameBoard): { board: GameBoard; score: number; moved: boolean } {
  const transposedBoard = transpose(board)
  const result = moveLeft(transposedBoard)
  return {
    ...result,
    board: transpose(result.board),
  }
}

export function moveDown(board: GameBoard): { board: GameBoard; score: number; moved: boolean } {
  const transposedBoard = transpose(board)
  const result = moveRight(transposedBoard)
  return {
    ...result,
    board: transpose(result.board),
  }
}

function transpose(board: GameBoard): GameBoard {
  return board[0].map((_, colIndex) => board.map((row) => row[colIndex]))
}

export function isGameOver(board: GameBoard): boolean {
  // Check for empty cells
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === null) return false
    }
  }

  // Check for possible merges
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const current = board[i][j]
      if ((j < 3 && current === board[i][j + 1]) || (i < 3 && current === board[i + 1][j])) {
        return false
      }
    }
  }

  return true
}

export function hasWon(board: GameBoard): boolean {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 2048) return true
    }
  }
  return false
}

export function getTileColor(value: number | null): string {
  if (!value) return "bg-gray-800"

  const colors: { [key: number]: string } = {
    2: "bg-gray-700 text-white",
    4: "bg-yellow-600 text-white",
    8: "bg-orange-500 text-white",
    16: "bg-orange-600 text-white",
    32: "bg-red-500 text-white",
    64: "bg-red-600 text-white",
    128: "bg-yellow-400 text-black",
    256: "bg-yellow-300 text-black",
    512: "bg-yellow-200 text-black",
    1024: "bg-yellow-100 text-black",
    2048: "bg-yellow-50 text-black font-bold",
  }

  return colors[value] || "bg-purple-500 text-white"
}
