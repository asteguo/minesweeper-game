// Game configuration
const config = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
};

// Game state
let gameState = {
    board: [],
    mineLocations: [],
    revealed: 0,
    gameOver: false,
    firstClick: true,
    timer: 0,
    timerInterval: null,
    minesLeft: 0,
    difficulty: 'easy'
};

// DOM elements
const boardElement = document.getElementById('board');
const minesCountElement = document.getElementById('mines-count');
const timerElement = document.getElementById('timer');
const gameStatusElement = document.getElementById('game-status');
const difficultySelect = document.getElementById('difficulty');
const newGameButton = document.getElementById('new-game');

// Initialize the game
function initGame(difficulty = 'easy') {
    // Reset game state
    gameState = {
        board: [],
        mineLocations: [],
        revealed: 0,
        gameOver: false,
        firstClick: true,
        timer: 0,
        timerInterval: null,
        minesLeft: config[difficulty].mines,
        difficulty: difficulty
    };

    // Update UI
    minesCountElement.textContent = gameState.minesLeft;
    timerElement.textContent = '0';
    gameStatusElement.textContent = '';
    gameStatusElement.className = 'game-status';

    // Clear timer if it exists
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }

    // Create the board
    createBoard(difficulty);
}

// Create the game board
function createBoard(difficulty) {
    const { rows, cols } = config[difficulty];
    
    // Clear the board
    boardElement.innerHTML = '';
    
    // Set the grid columns based on difficulty
    boardElement.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
    
    // Initialize the board array
    gameState.board = Array(rows).fill().map(() => Array(cols).fill(0));
    
    // Create cells
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // Add event listeners
            cell.addEventListener('click', () => handleCellClick(row, col));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(row, col);
            });
            
            boardElement.appendChild(cell);
        }
    }
}

// Place mines on the board (after first click)
function placeMines(firstRow, firstCol) {
    const { rows, cols, mines } = config[gameState.difficulty];
    gameState.mineLocations = [];
    
    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mines) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        
        // Don't place a mine on the first clicked cell or where a mine already exists
        if ((row !== firstRow || col !== firstCol) && gameState.board[row][col] !== -1) {
            gameState.board[row][col] = -1; // -1 represents a mine
            gameState.mineLocations.push({ row, col });
            minesPlaced++;
        }
    }
    
    // Calculate numbers for cells adjacent to mines
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (gameState.board[row][col] !== -1) {
                gameState.board[row][col] = countAdjacentMines(row, col);
            }
        }
    }
}

// Count mines adjacent to a cell
function countAdjacentMines(row, col) {
    let count = 0;
    const { rows, cols } = config[gameState.difficulty];
    
    // Check all 8 adjacent cells
    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
            if (r === row && c === col) continue; // Skip the cell itself
            if (gameState.board[r][c] === -1) count++;
        }
    }
    
    return count;
}

// Handle left click on a cell
function handleCellClick(row, col) {
    // Ignore clicks if game is over or cell is flagged
    const cellElement = getCellElement(row, col);
    if (gameState.gameOver || cellElement.classList.contains('flagged')) {
        return;
    }
    
    // First click logic
    if (gameState.firstClick) {
        gameState.firstClick = false;
        placeMines(row, col);
        startTimer();
    }
    
    // Check if clicked on a mine
    if (gameState.board[row][col] === -1) {
        revealMines();
        endGame(false);
        return;
    }
    
    // Reveal the cell
    revealCell(row, col);
    
    // Check for win
    checkWin();
}

// Handle right click (flag placement)
function handleRightClick(row, col) {
    if (gameState.gameOver) return;
    
    const cellElement = getCellElement(row, col);
    
    // Can't flag revealed cells
    if (cellElement.classList.contains('revealed')) {
        return;
    }
    
    // Toggle flag
    if (cellElement.classList.contains('flagged')) {
        cellElement.classList.remove('flagged');
        gameState.minesLeft++;
    } else {
        cellElement.classList.add('flagged');
        gameState.minesLeft--;
    }
    
    // Update mines counter
    minesCountElement.textContent = gameState.minesLeft;
}

// Reveal a cell
function revealCell(row, col) {
    const { rows, cols } = config[gameState.difficulty];
    const cellElement = getCellElement(row, col);
    
    // Skip if cell is already revealed or flagged
    if (cellElement.classList.contains('revealed') || cellElement.classList.contains('flagged')) {
        return;
    }
    
    // Reveal the cell
    cellElement.classList.add('revealed');
    gameState.revealed++;
    
    // If it's a number, show it
    if (gameState.board[row][col] > 0) {
        cellElement.textContent = gameState.board[row][col];
        cellElement.dataset.number = gameState.board[row][col];
    }
    
    // If it's an empty cell, reveal adjacent cells recursively
    if (gameState.board[row][col] === 0) {
        for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
                if (r === row && c === col) continue; // Skip the cell itself
                revealCell(r, c);
            }
        }
    }
}

// Reveal all mines when game is lost
function revealMines() {
    gameState.mineLocations.forEach(({ row, col }) => {
        const cellElement = getCellElement(row, col);
        cellElement.classList.add('revealed', 'mine');
        cellElement.textContent = '💣';
    });
}

// Check if player has won
function checkWin() {
    const { rows, cols, mines } = config[gameState.difficulty];
    const totalCells = rows * cols;
    
    if (gameState.revealed === totalCells - mines) {
        endGame(true);
    }
}

// End the game
function endGame(isWin) {
    gameState.gameOver = true;
    clearInterval(gameState.timerInterval);
    
    if (isWin) {
        gameStatusElement.textContent = 'You Win! 🎉';
        gameStatusElement.className = 'game-status win-message';
    } else {
        gameStatusElement.textContent = 'Game Over! 💥';
        gameStatusElement.className = 'game-status lose-message';
    }
}

// Start the timer
function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.timer++;
        timerElement.textContent = gameState.timer;
    }, 1000);
}

// Helper function to get cell element by row and column
function getCellElement(row, col) {
    return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

// Event listeners
difficultySelect.addEventListener('change', () => {
    initGame(difficultySelect.value);
});

newGameButton.addEventListener('click', () => {
    initGame(difficultySelect.value);
});

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

// Initialize the game
initGame();
