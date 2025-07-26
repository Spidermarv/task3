const crypto = require('crypto');
const readline = require('readline');

class SecureRandomGenerator {
    static generateSecureKey() {
        return crypto.randomBytes(32);
    }
    
    static generateUniformRandom(min, max, key) {
        const range = max - min + 1;
        const bytesNeeded = Math.ceil(Math.log2(range) / 8);
        
        let randomValue;
        let maxValid;
        
        do {
            const randomBytes = crypto.randomBytes(bytesNeeded);
            randomValue = 0;
            for (let i = 0; i < bytesNeeded; i++) {
                randomValue = (randomValue << 8) + randomBytes[i];
            }
            maxValid = Math.floor((Math.pow(256, bytesNeeded)) / range) * range - 1;
        } while (randomValue > maxValid);
        
        return (randomValue % range) + min;
    }
    
    static calculateHMAC(message, key) {
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(message.toString());
        return hmac.digest('hex').toUpperCase();
    }
    
    static async fairRandomGeneration(min, max, rl, purpose) {
        console.log(`\nGenerating fair random number for ${purpose}:`);
        
        const key = SecureRandomGenerator.generateSecureKey();
        const computerNumber = SecureRandomGenerator.generateUniformRandom(min, max, key);
        
        const hmac = SecureRandomGenerator.calculateHMAC(computerNumber, key);
        console.log(`I selected a random value in the range ${min}..${max} (HMAC=${hmac}).`);
        
        const userNumber = await SecureRandomGenerator.getUserNumber(min, max, rl);
        if (userNumber === null) return null;
        
        const keyHex = key.toString('hex').toUpperCase();
        console.log(`My number is ${computerNumber} (KEY=${keyHex}).`);
        
        const result = (computerNumber + userNumber) % (max - min + 1) + min;
        console.log(`The fair number generation result is ${computerNumber} + ${userNumber} = ${result} (mod ${max - min + 1}).`);
        
        return result;
    }
    
    static async getUserNumber(min, max, rl) {
        while (true) {
            console.log('Add your number modulo ' + (max - min + 1) + '.');
            for (let i = min; i <= max; i++) {
                console.log(`${i} - ${i}`);
            }
            console.log('X - exit');
            console.log('? - help');
            
            const choice = await SecureRandomGenerator.getUserInput('Your selection: ', rl);
            
            if (choice.toUpperCase() === 'X') {
                return null;
            } else if (choice === '?') {
                return '?';
            }
            
            const num = parseInt(choice);
            if (!isNaN(num) && num >= min && num <= max) {
                return num;
            } else {
                console.log(`Invalid selection. Please choose a number between ${min} and ${max}, X to exit, or ? for help.`);
            }
        }
    }
    
    static async getUserInput(prompt, rl) {
        return new Promise((resolve) => {
            rl.question(prompt, (answer) => {
                resolve(answer.trim());
            });
        });
    }
}

class Dice {
    constructor(faces, index) {
        this.faces = faces;
        this.index = index;
        this.name = `Dice ${index + 1}`;
    }
    
    toString() {
        return `[${this.faces.join(',')}]`;
    }
    
    getValue(faceIndex) {
        return this.faces[faceIndex];
    }
    
    getFaceCount() {
        return this.faces.length;
    }
}

class ProbabilityCalculator {
    static calculateWinProbabilities(dice) {
        const n = dice.length;
        const probabilities = [];
        
        for (let i = 0; i < n; i++) {
            probabilities[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    probabilities[i][j] = 0.5; // Same dice
                } else {
                    probabilities[i][j] = ProbabilityCalculator.calculatePairProbability(dice[i], dice[j]);
                }
            }
        }
        
        return probabilities;
    }
    
    static calculatePairProbability(dice1, dice2) {
        let wins = 0;
        let total = 0;
        
        for (let face1 of dice1.faces) {
            for (let face2 of dice2.faces) {
                if (face1 > face2) wins++;
                total++;
            }
        }
        
        return wins / total;
    }
    
    static displayProbabilityTable(dice) {
        const probabilities = ProbabilityCalculator.calculateWinProbabilities(dice);
        const n = dice.length;
        
        console.log('\nProbability table (row dice vs column dice):');
        console.log('Each cell shows the probability that the row dice wins against the column dice.');
        
        let header = '        ';
        for (let j = 0; j < n; j++) {
            header += `Dice${j + 1}  `;
        }
        console.log(header);
        
        let separator = '        ';
        for (let j = 0; j < n; j++) {
            separator += '-------';
        }
        console.log(separator);
        
        for (let i = 0; i < n; i++) {
            let row = `Dice${i + 1} | `;
            for (let j = 0; j < n; j++) {
                const prob = probabilities[i][j];
                if (i === j) {
                    row += '  -   ';
                } else {
                    row += prob.toFixed(3) + ' ';
                }
            }
            console.log(row);
        }
        
        console.log('\nDice configurations:');
        for (let i = 0; i < n; i++) {
            console.log(`Dice${i + 1}: ${dice[i]}`);
        }
    }
}

class DiceGame {
    constructor(diceConfigs) {
        this.dice = diceConfigs.map((config, i) => new Dice(config, i));
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    async determineFirstPlayer() {
        console.log("Let's determine who makes the first move.");
        
        while (true) {
            const result = await SecureRandomGenerator.fairRandomGeneration(0, 1, this.rl, "first move determination");
            if (result === null) return null; // User exited
            if (result === '?') {
                ProbabilityCalculator.displayProbabilityTable(this.dice);
                continue;
            }
            
            return result === 0; // true if computer goes first, false if user goes first
        }
    }
    
    async computerChooseDice(excludeIndex = -1) {
        const availableDice = this.dice.filter((_, i) => i !== excludeIndex);
        const randomIndex = Math.floor(Math.random() * availableDice.length);
        const selectedDice = availableDice[randomIndex];
        
        console.log(`I make the first move and choose the ${selectedDice} dice.`);
        return selectedDice.index;
    }
    
    async userChooseDice(excludeIndex = -1) {
        while (true) {
            console.log('Choose your dice:');
            
            for (let i = 0; i < this.dice.length; i++) {
                if (i !== excludeIndex) {
                    console.log(`${i} - ${this.dice[i].faces.join(',')}`);
                }
            }
            console.log('X - exit');
            console.log('? - help');
            
            const choice = await this.getUserInput('Your selection: ');
            
            if (choice.toUpperCase() === 'X') {
                return null;
            } else if (choice === '?') {
                ProbabilityCalculator.displayProbabilityTable(this.dice);
                continue;
            }
            
            const diceIndex = parseInt(choice);
            if (!isNaN(diceIndex) && diceIndex >= 0 && diceIndex < this.dice.length && diceIndex !== excludeIndex) {
                console.log(`You choose the ${this.dice[diceIndex]} dice.`);
                return diceIndex;
            } else {
                console.log('Invalid selection. Please choose an available dice number, X to exit, or ? for help.');
            }
        }
    }
    
    async rollDice(dice, playerName) {
        console.log(`It's time for ${playerName} roll.`);
        
        while (true) {
            const faceIndex = await SecureRandomGenerator.fairRandomGeneration(0, dice.getFaceCount() - 1, this.rl, `${playerName} dice roll`);
            if (faceIndex === null) return null;
            if (faceIndex === '?') {
                ProbabilityCalculator.displayProbabilityTable(this.dice);
                continue;
            }
            
            const rollResult = dice.getValue(faceIndex);
            console.log(`${playerName} roll result is ${rollResult}.`);
            return rollResult;
        }
    }
    
    async getUserInput(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => {
                resolve(answer.trim());
            });
        });
    }
    
    async playGame() {
        try {
            const computerFirst = await this.determineFirstPlayer();
            if (computerFirst === null) return;
            
            let firstPlayerDiceIndex, secondPlayerDiceIndex;
            let firstPlayerName, secondPlayerName;
            
            if (computerFirst) {
                firstPlayerDiceIndex = await this.computerChooseDice();
                secondPlayerDiceIndex = await this.userChooseDice(firstPlayerDiceIndex);
                if (secondPlayerDiceIndex === null) return;
                
                firstPlayerName = "my";
                secondPlayerName = "your";
            } else {
                firstPlayerDiceIndex = await this.userChooseDice();
                if (firstPlayerDiceIndex === null) return;
                
                secondPlayerDiceIndex = await this.computerChooseDice(firstPlayerDiceIndex);
                firstPlayerName = "your";
                secondPlayerName = "my";
            }
            
            const firstDice = this.dice[firstPlayerDiceIndex];
            const secondDice = this.dice[secondPlayerDiceIndex];
            
            const firstRoll = await this.rollDice(firstDice, firstPlayerName);
            if (firstRoll === null) return;
            
            const secondRoll = await this.rollDice(secondDice, secondPlayerName);
            if (secondRoll === null) return;
            
            if (computerFirst) {
                if (firstRoll > secondRoll) {
                    console.log(`I win (${firstRoll} > ${secondRoll})!`);
                } else if (secondRoll > firstRoll) {
                    console.log(`You win (${secondRoll} > ${firstRoll})!`);
                } else {
                    console.log(`It's a tie (${firstRoll} = ${secondRoll})!`);
                }
            } else {
                if (firstRoll > secondRoll) {
                    console.log(`You win (${firstRoll} > ${secondRoll})!`);
                } else if (secondRoll > firstRoll) {
                    console.log(`I win (${secondRoll} > ${firstRoll})!`);
                } else {
                    console.log(`It's a tie (${firstRoll} = ${secondRoll})!`);
                }
            }
            
        } catch (error) {
            if (error.code === 'SIGINT') {
                console.log('\nGame interrupted.');
            } else {
                throw error;
            }
        } finally {
            this.rl.close();
        }
    }
}

function parseDiceConfig(configStr) {
    const values = configStr.split(',').map(x => {
        const num = parseInt(x.trim());
        if (isNaN(num)) {
            throw new Error('All face values must be integers');
        }
        return num;
    });
    
    if (values.length !== 6) {
        throw new Error(`Each dice must have exactly 6 faces, got ${values.length}`);
    }
    
    return values;
}

function validateArguments(args) {
    if (args.length < 3) {
        throw new Error(`At least 3 dice configurations required, got ${args.length}`);
    }
    
    const diceConfigs = [];
    for (let i = 0; i < args.length; i++) {
        try {
            const config = parseDiceConfig(args[i]);
            diceConfigs.push(config);
        } catch (error) {
            throw new Error(`Error in dice ${i + 1}: ${error.message}`);
        }
    }
    
    return diceConfigs;
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log('Error: Insufficient arguments');
        console.log('Usage: node game.js <dice1> <dice2> <dice3> [dice4] ...');
        console.log('Each dice should be 6 comma-separated integers');
        console.log('Example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3');
        process.exit(1);
    }
    
    try {
        const diceConfigs = validateArguments(args);
        const game = new DiceGame(diceConfigs);
        await game.playGame();
    } catch (error) {
        if (error.message.includes('dice') || error.message.includes('required') || error.message.includes('faces') || error.message.includes('integers')) {
            console.log(`Error: ${error.message}`);
            console.log('Example usage: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3');
        } else {
            console.log(`Unexpected error: ${error.message}`);
        }
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    console.log('\nGame interrupted.');
    process.exit(0);
});

if (require.main === module) {
    main().catch(error => {
        console.error(`Unexpected error: ${error.message}`);
        process.exit(1);
    });
}