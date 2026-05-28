// ceo_market.js - CEO 人才市場與聘用邏輯子系統

const CEOMarket = {
    candidates: [],    // 待業中的 CEO 人才庫
    activeCEOs: {},    // 紀錄各公司現任 CEO (格式: { stockId: ceoObject })


    // 生成指定數量的 CEO
    generateCandidates: function(count) {
        const lastNames = ['陳','林','黃','張','李','王','吳','劉','蔡','楊','許','鄭','謝','洪','郭','邱','曾','廖','賴','徐','周','葉','蘇','莊','呂'];
        const firstNames = ['建國','台銘','忠謀','明相','志明','家豪','俊傑','信宏','柏宇','冠廷','雅婷','怡君','佳穎','淑芬','佩珊','宗翰','家維','柏翰','承恩','宇軒','哲瑋','志強','俊宏','志偉','欣妤'];

        for (let i = 0; i < count; i++) {
            let ln = lastNames[Math.floor(Math.random() * lastNames.length)];
            let fn = firstNames[Math.floor(Math.random() * firstNames.length)];
            let archetype = Math.random(); // 決定這個 CEO 的專長偏向

            let ceo = {
                id: 'ceo_' + i,
                name: ln + fn,
                age: Math.floor(Math.random() * 40) + 30, // 30歲 ~ 69歲
                stats: {
                    leadership: Math.floor(Math.random() * 50) + 30, // 領導力 (影響士氣與基礎產能)
                    rd: Math.floor(Math.random() * 50) + 30,         // 研發力 (影響產品開發速度與成功率)
                    finance: Math.floor(Math.random() * 50) + 30,    // 財務力 (影響資金調度與避稅/查稅風險)
                    marketing: Math.floor(Math.random() * 50) + 30,  // 行銷力 (影響新聞發布熱度與營收倍率)
                    operations: Math.floor(Math.random() * 50) + 30  // 營運力 (影響日常開銷與毛利率)
                },
                traits: [],
                salary: 0
            };

            // 根據專長偏向給予能力值加成 (打造有特色的 CEO)
            if (archetype < 0.2) ceo.stats.rd += 25;              // 研發狂人
            else if (archetype < 0.4) ceo.stats.finance += 25;    // 財務專家
            else if (archetype < 0.6) ceo.stats.marketing += 25;  // 行銷大師
            else if (archetype < 0.8) ceo.stats.operations += 25; // 營運高手
            else ceo.stats.leadership += 25;                      // 天生領袖

            // 確保能力值不超過 100
            for (let key in ceo.stats) {
                if (ceo.stats[key] > 100) ceo.stats[key] = 100;
            }

            // [關鍵優化] 低底價保底 + 後期立方爆發曲線，讓小公司請得起新人，大企業搶頂級人才
            let totalStats = Object.values(ceo.stats).reduce((a, b) => a + b, 0);
            
            // 基礎保底 200 萬。當能力超過 150 分後開始計算溢價，超過 300 分呈立方級暴增
            let statBonus = Math.floor(Math.pow(Math.max(0, totalStats - 150) / 50, 3) * 1000000);
            let randomBonus = Math.floor(Math.random() * 1000000); // 0~100萬隨機津貼
            
            ceo.salary = 2000000 + statBonus + randomBonus;

            // 隨機賦予 1~2 個特質 (對應 CEO_CONFIG.traits)
            if (typeof CEO_CONFIG !== 'undefined' && CEO_CONFIG.traits) {
                let traitKeys = Object.keys(CEO_CONFIG.traits);
                let numTraits = Math.random() > 0.6 ? 2 : 1; 
                for (let j = 0; j < numTraits; j++) {
                    let randomTrait = traitKeys[Math.floor(Math.random() * traitKeys.length)];
                    if (!ceo.traits.includes(randomTrait)) {
                        ceo.traits.push(randomTrait);
                    }
                }
            }
            this.candidates.push(ceo);
        }
    },

    // AI 公司董事會從市場中尋找並聘用 CEO
    hireForStock: function(stock) {
        if (stock.currentCEO) return;

        // 根據產業決定看重的能力
        let requiredStats = ['leadership'];
        if (stock.sector === 'semi' || stock.sector === 'software_ai') {
            requiredStats.push('rd', 'operations');
        } else if (stock.sector === 'finance' || stock.sector === 'realestate') {
            requiredStats.push('finance', 'marketing');
        } else {
            requiredStats.push('marketing', 'operations');
        }

        // 面試評分系統
        const scoreCEO = (ceo) => {
            let score = 0;
            requiredStats.forEach(stat => score += ceo.stats[stat] * 1.5);
            Object.keys(ceo.stats).forEach(stat => {
                if (!requiredStats.includes(stat)) score += ceo.stats[stat] * 0.5;
            });
            return score;
        };

        // [關鍵新增] 評估公司可負擔的最高年薪上限 (設定為帳上現金的 40%，且至少保底允許聘用 300 萬以下的新人)
        let maxAffordableSalary = Math.max(3000000, Math.floor((stock.corporateCash || 0) * 0.4));

        // 1. 優先過濾出公司預算負擔得起的候選人
        let affordableCandidates = this.candidates.filter(c => c.salary <= maxAffordableSalary);

        // 2. 萬一市場上完全沒有低於預算的人，迫於無奈挑選全體市場中最便宜的前 5 位備取
        let poolToPick = affordableCandidates.length > 0 ? affordableCandidates : [...this.candidates].sort((a, b) => a.salary - b.salary).slice(0, 5);

        // 3. 在買得起的人選中，依據業務專長契合度(面試評分)進行高低排序
        poolToPick.sort((a, b) => scoreCEO(b) - scoreCEO(a));
        let hiredCEO = poolToPick[0];
        
        if (hiredCEO) {
            // 從全域真正的 candidates 待業陣列中完美除名被錄取的人
            let originalIdx = this.candidates.findIndex(c => c.id === hiredCEO.id);
            if (originalIdx !== -1) this.candidates.splice(originalIdx, 1);

            stock.currentCEO = hiredCEO;
            this.activeCEOs[stock.id] = hiredCEO;
            
            const salaryWan = (hiredCEO.salary / 10000).toFixed(0);
            const budgetWan = (maxAffordableSalary / 10000).toFixed(0);
            console.log(`【董事會選才】${stock.name} 經預算把關(上限: $${budgetWan}萬)，正式聘請年薪 $${salaryWan}萬 的 ${hiredCEO.name} 擔任 CEO。`);
        }
    },

    // 系統初始化時只處理「生成人才庫」
    init: function() {
        this.candidates = [];
        this.activeCEOs = {};
        this.generateCandidates(150);
        // 不再在 init 裡呼叫 initialHiring，改由上市流程觸發
    }
};

window.CEOMarket = CEOMarket;