// game.js
const CONFIG = {
    techTree: {
        'agriculture': { 
            name: 'Земледелие', 
            cost: { gold: 100, food: 50 }, 
            required: [], 
            unlocks: ['farm'],
            description: 'Позволяет строить фермы для производства пищи'
        },
        'masonry': { 
            name: 'Каменная кладка', 
            cost: { gold: 150, stone: 80 }, 
            required: [], 
            unlocks: ['quarry', 'stone_house', 'mine'],
            description: 'Открывает каменные постройки и улучшения'
        },
        'wheel': { 
            name: 'Колесо', 
            cost: { gold: 200, wood: 100 }, 
            required: [], 
            unlocks: ['trade'],
            description: 'Улучшает торговые возможности'
        }
    },
    buildings: {
        'hut': { 
            name: 'Хижина', 
            baseCost: { wood: 30 }, 
            effect: { population: 5 },
            upgradedEffect: { population: 8 },
            description: 'Увеличивает население на 5 (8 после улучшения)',
            availableFromStart: true,
            upgradable: true,
            upgradeCost: { stone: 50, wood: 20 }
        },
        'wood_camp': { 
            name: 'Лесопилка', 
            baseCost: { wood: 20 }, 
            production: { wood: 15 },
            upgradedProduction: { wood: 25 },
            description: 'Производит 15 древесины в год (25 после улучшения)',
            availableFromStart: true,
            upgradable: true,
            upgradeCost: { stone: 40, wood: 15 }
        },
        'hunting_camp': { 
            name: 'Охотничий лагерь', 
            baseCost: { wood: 25 }, 
            production: { food: 20 },
            upgradedProduction: { food: 35 },
            description: 'Производит 20 еды в год (35 после улучшения)',
            availableFromStart: true,
            upgradable: true,
            upgradeCost: { stone: 30, wood: 15 }
        },
        'mine': {
            name: 'Шахта',
            baseCost: { wood: 100, stone: 50 },
            production: { 
                gold: { chance: 0.05, amount: 10 },
                stone: { chance: 0.15, amount: 20 }
            },
            description: '5% шанс добычи 10 золота, 15% шанс добычи 20 камня',
            availableFromStart: false,
            requiresTech: 'masonry',  // Требуется технология "Каменная кладка"
            upgradable: true,
            upgradeCost: { stone: 80, gold: 50 }
        },
        'stone_house': { 
            name: 'Каменный дом', 
            baseCost: { stone: 50, wood: 20 }, 
            effect: { population: 10 },
            description: 'Увеличивает население на 10',
            availableFromStart: false
        },
        'farm': { 
            name: 'Ферма', 
            baseCost: { wood: 40, stone: 20 }, 
            production: { food: 50 },
            upgradedProduction: { food: 75 },
            description: 'Производит 50 еды в год (75 после улучшения)',
            availableFromStart: false,
            upgradable: true,
            upgradeCost: { stone: 60, wood: 30 }
        },
        'quarry': { 
            name: 'Каменоломня', 
            baseCost: { wood: 60, stone: 30 }, 
            production: { stone: 30 },
            upgradedProduction: { stone: 45 },
            description: 'Производит 30 камня в год (45 после улучшения)',
            availableFromStart: false,
            upgradable: true,
            upgradeCost: { stone: 70, gold: 40 }
        }
    },
    events: [
        { 
            name: 'Засуха', 
            condition: (game) => Math.random() > 0.7 && Object.keys(game.buildings).some(b => b === 'farm'),
            effect: (game) => { 
                const penalty = 0.3 + Math.random() * 0.2;
                game.resources.food = Math.floor(game.resources.food * (1 - penalty)); 
                return `Урожай снижен на ${Math.floor(penalty * 100)}%!`; 
            } 
        },
        { 
            name: 'Находка', 
            chance: 0.15,
            effect: (game) => { 
                const goldFound = 50 + Math.floor(Math.random() * 100);
                game.resources.gold += goldFound;
                return `Найдено золото (+${goldFound})!`; 
            } 
        },
        {
            name: 'Эпидемия',
            condition: (game) => game.population > 80 && Math.random() > 0.8,
            effect: (game) => {
                const deaths = Math.floor(game.population * 0.1 + Math.random() * 0.1);
                game.population -= deaths;
                return `Эпидемия! Погибло ${deaths} жителей.`;
            }
        }
    ]
};

function initState() {
    return {
        cityName: 'Новый Город',
        year: 1,
        era: 'Каменный век',
        population: 30,
        morale: 100,
        resources: { 
            wood: 80, 
            stone: 300, 
            food: 150, 
            gold: 30 
        },
        buildings: {},
        technologies: [],
        eventLog: [],
        lastEventYear: 0,
        foodProduction: 0,
        stoneProduction: 0,
        woodProduction: 0,
        upgradedBuildings: {}
    };
}

let gameState = initState();

const elements = {
    cityName: document.getElementById("city-name"),
    year: document.getElementById("year"),
    era: document.getElementById("era"),
    population: document.getElementById("population"),
    morale: document.getElementById("morale"),
    wood: document.getElementById("wood"),
    stone: document.getElementById("stone"),
    food: document.getElementById("food"),
    gold: document.getElementById("gold"),
    techList: document.getElementById("tech-list"),
    researchList: document.getElementById("research-list"),
    buildingsList: document.getElementById("buildings-list"),
    actionsList: document.getElementById("actions-list"),
    eventLog: document.getElementById("event-log")
};

function initGame() {
    const saved = localStorage.getItem('cityBuilderSave');
    if (saved) {
        if (confirm('Обнаружено сохранение. Загрузить игру?')) {
            loadGame();
        } else {
            newGame();
        }
    } else {
        newGame();
    }
    updateUI();
}

function newGame() {
    if (gameState.year > 1 && !confirm('Вы уверены? Весь прогресс будет потерян!')) {
        return;
    }
    
    gameState = initState();
    gameState.cityName = prompt("Введите название вашего города:", "Новый Город") || "Новый Город";
    localStorage.setItem('cityName', gameState.cityName);
    
    elements.eventLog.innerHTML = '<h3>События:</h3>';
    gameState.eventLog = [];
    
    logEvent(`Основан город ${gameState.cityName}!`);
    updateUI();
}

function updateUI() {
    elements.cityName.textContent = gameState.cityName;
    elements.year.textContent = gameState.year;
    elements.era.textContent = gameState.era;
    elements.population.textContent = gameState.population;
    elements.morale.textContent = gameState.morale;
    
    elements.wood.textContent = gameState.resources.wood;
    elements.stone.textContent = gameState.resources.stone;
    elements.food.textContent = gameState.resources.food;
    elements.gold.textContent = gameState.resources.gold;
    
    renderTechList();
    renderResearchList();
    renderBuildings();
    renderActions();
}

function renderTechList() {
    elements.techList.innerHTML = gameState.technologies
        .map(techId => {
            const tech = CONFIG.techTree[techId];
            return `<div class="tech-item">
                <strong>${tech.name}</strong>: ${tech.description}
            </div>`;
        })
        .join('') || '<div>Еще не исследовано технологий</div>';
}

function renderResearchList() {
    elements.researchList.innerHTML = getAvailableTechs()
        .map(tech => {
            const costStr = Object.entries(tech.cost)
                .map(([res, amount]) => `${res === 'gold' ? '🪙' : res === 'food' ? '🌾' : res === 'wood' ? '🪵' : '🪨'}${amount}`)
                .join(' ');
            
            return `<button onclick="researchTech('${tech.id}')">
                ${tech.name} (${costStr})<br>
                <small>${tech.description}</small>
            </button>`;
        })
        .join('') || '<div>Нет доступных технологий для исследования</div>';
}

function renderBuildings() {
    elements.buildingsList.innerHTML = Object.entries(gameState.buildings)
        .map(([type, count]) => {
            const info = CONFIG.buildings[type];
            const isUpgraded = gameState.upgradedBuildings[type] || false;
            const canUpgrade = info.upgradable && 
                gameState.technologies.includes('masonry') && 
                !isUpgraded;
            
            return `<div class="building-item">
                <strong>${info.name}</strong> × ${count} ${isUpgraded ? '(Улучшено)' : ''}
                ${canUpgrade ? `<button class="upgrade-btn" onclick="upgradeBuilding('${type}')">Улучшить</button>` : ''}
                <br><small>${info.description}</small>
            </div>`;
        })
        .join('') || '<div>Нет построек</div>';
}

function renderActions() {
    elements.actionsList.innerHTML = getAvailableBuildings()
        .map(building => {
            const costStr = Object.entries(building.baseCost)
                .map(([res, amount]) => `${res === 'wood' ? '🪵' : res === 'stone' ? '🪨' : res === 'food' ? '🌾' : '🪙'}${amount}`)
                .join(' ');
            
            return `<button onclick="build('${building.id}')">
                🏗️ ${building.name} (${costStr})<br>
                <small>${building.description}</small>
            </button>`;
        })
        .join('') || '<div>Нет доступных построек</div>';
}

function getAvailableTechs() {
    return Object.entries(CONFIG.techTree)
        .filter(([id, tech]) => 
            !gameState.technologies.includes(id) && 
            tech.required.every(req => gameState.technologies.includes(req)))
        .map(([id, tech]) => ({ id, ...tech }));
}

function getAvailableBuildings() {
    return Object.entries(CONFIG.buildings)
        .filter(([id, building]) => {
            // Проверяем доступность с начала игры
            if (building.availableFromStart) return true;
            
            // Проверяем, открыта ли технологией
            const unlockedByTech = Object.entries(CONFIG.techTree)
                .some(([techId, tech]) => 
                    gameState.technologies.includes(techId) && 
                    tech.unlocks.includes(id));
            
            // Проверяем дополнительные требования
            const meetsRequirements = !building.requiresTech || 
                gameState.technologies.includes(building.requiresTech);
            
            return unlockedByTech && meetsRequirements;
        })
        .map(([id, building]) => ({ id, ...building }));
}

function researchTech(techId) {
    const tech = CONFIG.techTree[techId];
    if (!tech) return;
    
    for (const [res, amount] of Object.entries(tech.cost)) {
        if (gameState.resources[res] < amount) {
            logEvent(`Не хватает ресурсов для исследования ${tech.name}!`);
            return;
        }
    }
    
    for (const [res, amount] of Object.entries(tech.cost)) {
        gameState.resources[res] -= amount;
    }
    
    gameState.technologies.push(techId);
    logEvent(`Исследована технология: ${tech.name}!`);
    
    updateUI();
}

function build(buildingId) {
    const building = CONFIG.buildings[buildingId];
    if (!building) return;

    // Проверка технологических требований
    if (building.requiresTech && !gameState.technologies.includes(building.requiresTech)) {
        logEvent(`Требуется технология: ${CONFIG.techTree[building.requiresTech].name}!`);
        return;
    }

    // Проверка ресурсов
    for (const [res, amount] of Object.entries(building.baseCost)) {
        if (gameState.resources[res] < amount) {
            logEvent(`Не хватает ресурсов для постройки ${building.name}!`);
            return;
        }
    }

    // Списание ресурсов
    for (const [res, amount] of Object.entries(building.baseCost)) {
        gameState.resources[res] -= amount;
    }

    // Добавление здания
    if (!gameState.buildings[buildingId]) {
        gameState.buildings[buildingId] = 1;
    } else {
        gameState.buildings[buildingId]++;
    }

    // Для шахты не нужно обновлять производство, так как она работает через события
    if (buildingId !== 'mine') {
        updateProduction(buildingId, gameState.upgradedBuildings[buildingId] || false);
    }

    logEvent(`Построено: ${building.name}`);
    updateUI();
}

function upgradeBuilding(buildingId) {
    const building = CONFIG.buildings[buildingId];
    if (!building || !building.upgradable) return;
    
    if (gameState.upgradedBuildings[buildingId]) {
        logEvent(`${building.name} уже улучшены!`);
        return;
    }
    
    for (const [res, amount] of Object.entries(building.upgradeCost)) {
        if (gameState.resources[res] < amount) {
            logEvent(`Не хватает ресурсов для улучшения ${building.name}!`);
            return;
        }
    }
    
    for (const [res, amount] of Object.entries(building.upgradeCost)) {
        gameState.resources[res] -= amount;
    }
    
    gameState.upgradedBuildings[buildingId] = true;
    updateProduction(buildingId, true);
    logEvent(`${building.name} улучшены!`);
    updateUI();
}

function updateProduction(buildingId, isUpgrade) {
    const building = CONFIG.buildings[buildingId];
    const count = gameState.buildings[buildingId] || 0;
    
    if (building.production) {
        if (typeof building.production === 'object' && building.production.gold) {
            // Шахта - обрабатывается в nextYear
            return;
        }
        
        const production = isUpgrade && building.upgradedProduction ? 
            building.upgradedProduction : building.production;
        
        for (const [res, amount] of Object.entries(production)) {
            const currentProduction = gameState[`${res}Production`] || 0;
            const baseProduction = isUpgrade ? 
                (building.production[res] * count) : 
                (building.production[res] * (count - 1));
            const newProduction = amount * count;
            
            gameState[`${res}Production`] = currentProduction - baseProduction + newProduction;
        }
    }
    
    if (building.effect?.population) {
        const effect = isUpgrade && building.upgradedEffect ? 
            building.upgradedEffect.population : building.effect.population;
        gameState.population += effect * count;
    }
}

function nextYear() {
    gameState.year++;
    
    // Производство ресурсов
    gameState.resources.food += gameState.foodProduction || 0;
    gameState.resources.stone += gameState.stoneProduction || 0;
    gameState.resources.wood += gameState.woodProduction || 0;
    
    // Добыча в шахтах
    if (gameState.buildings.mine) {
        const mineCount = gameState.buildings.mine;
        const isUpgraded = gameState.upgradedBuildings.mine;
        const production = isUpgraded ? 
            CONFIG.buildings.mine.upgradedProduction : 
            CONFIG.buildings.mine.production;
        
        for (let i = 0; i < mineCount; i++) {
            if (Math.random() < production.gold.chance) {
                gameState.resources.gold += production.gold.amount;
            }
            if (Math.random() < production.stone.chance) {
                gameState.resources.stone += production.stone.amount;
            }
        }
    }
    
    // Потребление пищи
    const foodNeeded = gameState.population * 2;
    gameState.resources.food -= foodNeeded;
    
    if (gameState.resources.food < 0) {
        const starvation = Math.min(Math.floor(-gameState.resources.food / 10), gameState.population);
        gameState.population -= starvation;
        gameState.morale -= 10;
        logEvent(`Голод! Погибло ${starvation} жителей. Мораль снижена.`);
        gameState.resources.food = 0;
    } else if (gameState.resources.food > foodNeeded * 2) {
        gameState.morale = Math.min(100, gameState.morale + 5);
    }
    
    tryTriggerEvent();
    
    if (gameState.year % 5 === 0) {
        saveGame();
    }
    
    updateUI();
}

function tryTriggerEvent() {
    if (gameState.year - gameState.lastEventYear < 5) return;
    
    const possibleEvents = CONFIG.events.filter(event => {
        if (event.chance && Math.random() > event.chance) return false;
        if (event.condition && !event.condition(gameState)) return false;
        return true;
    });
    
    if (possibleEvents.length > 0) {
        const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
        const message = event.effect(gameState);
        logEvent(`Событие: ${event.name}! ${message}`);
        gameState.lastEventYear = gameState.year;
    }
}

function logEvent(message) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const entry = document.createElement("div");
    entry.innerHTML = `<strong>Год ${gameState.year}</strong> (${timeStr}): ${message}`;
    elements.eventLog.appendChild(entry);
    elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
    
    gameState.eventLog.push(`${gameState.year}: ${message}`);
    if (gameState.eventLog.length > 50) {
        gameState.eventLog.shift();
    }
}

function saveGame() {
    const saveData = {
        cityName: gameState.cityName,
        year: gameState.year,
        era: gameState.era,
        population: gameState.population,
        morale: gameState.morale,
        resources: { ...gameState.resources },
        buildings: { ...gameState.buildings },
        technologies: [...gameState.technologies],
        foodProduction: gameState.foodProduction,
        stoneProduction: gameState.stoneProduction,
        woodProduction: gameState.woodProduction,
        lastEventYear: gameState.lastEventYear,
        upgradedBuildings: { ...gameState.upgradedBuildings }
    };
    
    localStorage.setItem('cityBuilderSave', JSON.stringify(saveData));
    logEvent('Игра сохранена!');
}

function loadGame() {
    const saved = localStorage.getItem('cityBuilderSave');
    if (saved) {
        try {
            const saveData = JSON.parse(saved);
            gameState = {
                ...initState(),
                ...saveData,
                resources: { ...initState().resources, ...saveData.resources }
            };
            logEvent('Игра загружена из сохранения');
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            newGame();
        }
    }
}

window.onload = initGame;