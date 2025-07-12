document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const prizeForm = document.getElementById('prize-form');
    const prizeInput = document.getElementById('prize-input');
    const prizeList = document.getElementById('prize-list');
    const updatePrizesBtn = document.getElementById('update-prizes');
    const slotMachine = document.getElementById('slot-machine');
    const spinButton = document.getElementById('spin-button');
    const resultMessage = document.getElementById('result-message');

    // State
    let prizes = [];
    let gamePrizes = [];
    let isSpinning = false;
    const MAX_PRIZES = 5;

    const createSlotCells = () => {
        slotMachine.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.classList.add('slot-cell');
            cell.setAttribute('aria-label', 'Slot cell');
            cell.dataset.index = i.toString();
            const reel = document.createElement('div');
            reel.classList.add('reel');
            cell.appendChild(reel);
            slotMachine.appendChild(cell);
        }
    };
    
    // Initialize
    createSlotCells();
    updateSpinButtonState();

    const renderPrizes = () => {
        prizeList.innerHTML = '';
        prizes.forEach((prize, index) => {
            const prizeTag = document.createElement('div');
            prizeTag.classList.add('prize-tag');
            prizeTag.textContent = prize;

            const removeBtn = document.createElement('button');
            removeBtn.classList.add('remove-btn');
            removeBtn.innerHTML = '&times;';
            removeBtn.setAttribute('aria-label', `移除獎品 ${prize}`);
            removeBtn.onclick = () => {
                prizes.splice(index, 1);
                renderPrizes();
            };
            prizeTag.appendChild(removeBtn);
            prizeList.appendChild(prizeTag);
        });
    };

    const showMessage = (text, type = 'info') => {
        resultMessage.textContent = text;
        let color = 'var(--primary-neon)';
        if (type === 'error') {
            color = 'var(--secondary-neon)';
        } else if (type === 'success' && text.startsWith('恭喜')) {
            color = 'var(--secondary-neon)';
        }
        resultMessage.style.color = color;

        if (type === 'success') {
            resultMessage.classList.add('feedback-success');
            setTimeout(() => resultMessage.classList.remove('feedback-success'), 800);
        }
    };

    function updateSpinButtonState() {
        spinButton.disabled = isSpinning || gamePrizes.length === 0;
    }

    prizeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPrize = prizeInput.value.trim();
        if (!newPrize) {
            showMessage('獎品名稱不能為空', 'error');
            return;
        }
        if (prizes.length >= MAX_PRIZES) {
            showMessage(`最多只能設定 ${MAX_PRIZES} 個獎品`, 'error');
            return;
        }
        if (prizes.includes(newPrize)) {
            showMessage('獎品名稱不能重複', 'error');
            return;
        }
        prizes.push(newPrize);
        renderPrizes();
        prizeInput.value = '';
        prizeInput.focus();
    });

    updatePrizesBtn.addEventListener('click', () => {
        if (prizes.length < 1) {
            showMessage('請至少新增 1 個獎品', 'error');
            return;
        }
        gamePrizes = [...prizes];
        showMessage('獎品已更新至拉霸機!', 'success');
        
        const cells = slotMachine.querySelectorAll('.slot-cell .reel');
        cells.forEach(cell => {
            const reel = cell;
            const parentCell = reel.parentElement;
            if (!parentCell) return;
            
            reel.style.transform = 'translateY(0)';
            reel.innerHTML = ''; 
            const item = document.createElement('div');
            item.className = 'reel-item';
            item.style.height = `${parentCell.offsetHeight}px`;
            item.textContent = gamePrizes[Math.floor(Math.random() * gamePrizes.length)];
            reel.appendChild(item);
        });
        updateSpinButtonState();
    });

    spinButton.addEventListener('click', () => {
        if (isSpinning || gamePrizes.length === 0) return;
    
        isSpinning = true;
        updateSpinButtonState();
        showMessage('');
    
        const cells = slotMachine.querySelectorAll('.slot-cell');
        cells.forEach(cell => cell.classList.remove('winning'));
    
        const finalResults = [];
        const reels = slotMachine.querySelectorAll('.slot-cell .reel');
        let maxDuration = 0;
    
        reels.forEach((reel, i) => {
            const r = reel;
            const cell = r.parentElement;
            if (!cell) return;
    
            const cellHeight = cell.offsetHeight;
            if (cellHeight === 0) {
                console.error("Cell height is 0, skipping animation for this reel.");
                return;
            }
    
            // 1. Prepare reel content
            const reelItems = [];
            for (let j = 0; j < 30; j++) {
                reelItems.push(gamePrizes[Math.floor(Math.random() * gamePrizes.length)]);
            }
            const finalPrize = gamePrizes[Math.floor(Math.random() * gamePrizes.length)];
            reelItems.push(finalPrize);
            finalResults[i] = finalPrize;
    
            // 2. Set initial state (no transition, content loaded)
            r.style.transition = 'none';
            r.innerHTML = '';
            reelItems.forEach(prize => {
                const item = document.createElement('div');
                item.className = 'reel-item';
                item.style.height = `${cellHeight}px`;
                item.textContent = prize;
                r.appendChild(item);
            });
            // Reset position to the top
            r.style.transform = 'translateY(0)';

            // 3. Trigger animation after a short delay.
            // This robustly prevents a race condition where the browser starts the animation
            // before it has painted the new reel content. A tiny timeout gives the browser
            // a separate event loop tick to guarantee the render is complete.
            setTimeout(() => {
                // To create a "gradual stop" effect, we'll make each column stop at a different time.
                const columnIndex = i % 3;
                const duration = 2.5 + columnIndex * 0.4 + Math.random() * 0.2;
                if (duration > maxDuration) maxDuration = duration;
    
                r.style.transition = `transform ${duration}s cubic-bezier(0.25, 1, 0.5, 1)`;
                const targetPosition = - (reelItems.length - 1) * cellHeight;
                r.style.transform = `translateY(${targetPosition}px)`;
            }, 10); // A 10ms delay is imperceptible but very effective.
        });
    
        // Wait for the longest animation to finish before checking the result
        setTimeout(() => stopSpin(finalResults), (maxDuration * 1000) + 100);
    });

    const stopSpin = (finalResults) => {
        checkWin(finalResults);

        // After the animation, clean up the reels to display the final state permanently.
        // This ensures the result is visible and removes the long, temporary reel elements from the DOM.
        const reels = slotMachine.querySelectorAll('.slot-cell .reel');
        reels.forEach((reel, i) => {
            const r = reel;
            const cell = r.parentElement;
            if (!cell) return;

            // Remove the transition to prevent any further unwanted animation.
            r.style.transition = 'none';

            // Clear the long list of temporary items.
            r.innerHTML = '';

            // Create a single, permanent item displaying the final result.
            const finalItem = document.createElement('div');
            finalItem.className = 'reel-item';
            finalItem.textContent = finalResults[i]; // Use the definitive result.
            finalItem.style.height = `${cell.offsetHeight}px`; // Ensure it fills the cell.
            r.appendChild(finalItem);
            
            // Reset the transform to place the single item correctly in the cell's center.
            r.style.transform = 'translateY(0)';
        });

        isSpinning = false;
        updateSpinButtonState();
    };

    const checkWin = (grid) => {
        const winningCombos = [
            // Rows
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            // Cols
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            // Diagonals
            [0, 4, 8], [2, 4, 6]
        ];

        let winningLines = 0;
        const winningCells = new Set();
        const winningPrizes = [];

        winningCombos.forEach(combo => {
            const [a, b, c] = combo;
            // Ensure all cells in the combo exist in the grid before checking
            if (grid[a] && grid[a] === grid[b] && grid[a] === grid[c]) {
                winningLines++;
                if (!winningPrizes.includes(grid[a])) {
                    winningPrizes.push(grid[a]);
                }
                combo.forEach(index => winningCells.add(index));
            }
        });

        if (winningLines > 0) {
            const prizeText = winningPrizes.join(', ');
            showMessage(`恭喜中獎! ${winningLines}條線 - ${prizeText}`, 'success');
            winningCells.forEach(index => {
                slotMachine.querySelector(`[data-index='${index}']`)?.classList.add('winning');
            });
        } else {
            showMessage('再試一次!', 'info');
        }
    };
});