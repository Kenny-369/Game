// ceo.js - CEO 營運與資本模擬子系統

const CEO_CONFIG = {
    // [新增] 研發階段隨機事件庫
    rdEvents: RD_EVENTS_DATA,
    projectTypes: PROJECT_TYPES_DATA,

    // 高階主管特質庫 (已擴充多樣性)
    traits: {
        'perfectionist': { name: '完美主義者', desc: '產品基礎品質 +20%，但開發週期有 30% 機率強制延後一季。', isBad: false },
        'hype_master': { name: '畫餅大師', desc: '發布新聞市場熱度額外 +0.5，但市場預期及格線大幅提高。', isBad: false },
        'wall_street_rat': { name: '華爾街老鼠', desc: '資本操作手續費減半，但有 5% 機率引發 SEC 查緝導致暴跌。', isBad: true },
        'cost_cutter': { name: '成本殺手', desc: '公司日常營運與研發費用降低 20%，但員工士氣與產品創新度下降。', isBad: false },
        'visionary': { name: '技術狂人', desc: '革命性產品成功率增加 15%，但開發預算極度容易超支。', isBad: false },
        // --- 以下為新增特質 ---
        'born_leader': { name: '天生領袖', desc: '極具人格魅力，能穩定軍心，公司遭遇利空打擊時股價跌幅減少 10%。', isBad: false },
        'scandal_prone': { name: '桃色炸彈', desc: '私生活爭議多，每季有 3% 機率爆發個人醜聞導致公司名譽與股價重挫。', isBad: true },
        'conservative': { name: '保守派', desc: '財務極度穩健，被查稅機率歸零，但研發重大突破機率降低 20%。', isBad: false },
        'nepotism': { name: '裙帶關係', desc: '喜歡安插親信，公司每月固定營運成本額外增加 15%。', isBad: true },
        'iron_fist': { name: '鐵血手腕', desc: '裁員與重組無需額外花費，但勞資關係緊繃，容易引發罷工事件。', isBad: false }
    },
};


const CEO_MODULE = {
    currentTab: 'main', // 新增：紀錄當前開啟的頁籤，預設為 main

    currentCorpTrade: null,

    openCorpTradeModal(targetId, type) {
        const s = app.state.stocks[this.currentCompanyIdx];
        const targetStock = app.state.stocks.find(x => x.id === targetId);
        if (!s || !targetStock) return;

        this.currentCorpTrade = { targetId, type };

        let totalCorpOwned = 0;
        app.state.stocks.forEach(c => {
            if (c.corporateInvestments && c.corporateInvestments[targetId]) {
                totalCorpOwned += c.corporateInvestments[targetId].owned;
            }
        });
        let publicFloat = targetStock.totalShares - (targetStock.owned || 0) - totalCorpOwned;
        if (publicFloat < 0) publicFloat = 0;
        this.currentCorpTrade.publicFloat = publicFloat;

        let inv = (s.corporateInvestments && s.corporateInvestments[targetId]) ? s.corporateInvestments[targetId].owned : 0;
        let pct = ((inv / targetStock.totalShares) * 100).toFixed(2);

        let modal = document.getElementById('modal-corp-trade');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-corp-trade';
            modal.className = 'fixed inset-0 bg-black bg-opacity-95 hidden flex flex-col items-center justify-center z-[60] p-4 crt crt-flicker';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
        <div class="panel p-6 w-full max-w-sm border-blue-500 shadow-[0_0_20px_rgba(0,0,255,0.2)]">
            <div class="flex justify-between items-center border-b border-blue-800 pb-2 mb-4">
                <h3 id="corp-trade-title" class="text-xl text-blue-400 font-bold">\${type === 'buy' ? '買進股票 (企業轉投資)' : '賣出股票 (企業持股拋售)'}</h3>
            </div>
            <div class="text-sm space-y-2 mb-4 text-gray-300">
                <div class="flex justify-between"><span>標的企業:</span> <span class="text-yellow font-bold">\${targetStock.name}</span></div>
                <div class="flex justify-between"><span>市場現價:</span> <span class="text-cyan font-bold">\\$\${app.formatMoney(targetStock.price)}</span></div>
                <div class="flex justify-between"><span>市場流通量:</span> <span class="text-white">\${app.formatMoney(publicFloat)} 股</span></div>
                <div class="flex justify-between"><span>企業已持有:</span> <span class="text-white">\${app.formatMoney(inv)} 股 (\${pct}%)</span></div>
                <div class="flex justify-between border-t border-gray-800 pt-2 text-xs text-gray-400">
                    <span>企業現鈔:</span> 
                    <span class="text-green-400 font-mono">\\$\${app.formatMoney(s.corporateCash)}</span>
                </div>
            </div>
            <div class="mb-4">
                <label class="text-xs text-gray-400 block mb-1">交易數量 (股):</label>
                <input type="number" id="corp-trade-qty" class="bg-black border border-blue-500 w-full p-2 text-white outline-none font-bold text-lg" placeholder="輸入股數" oninput="CEO_MODULE.updateCorpTradeUI()">
                <div class="grid grid-cols-4 gap-1 mt-2">
                    <button class="btn-retro py-1 text-[10px]" onclick="CEO_MODULE.addCorpTradeQty(100000)">+10萬</button>
                    <button class="btn-retro py-1 text-[10px]" onclick="CEO_MODULE.addCorpTradeQty(10000)">+1萬</button>
                    <button class="btn-retro py-1 text-[10px]" onclick="CEO_MODULE.addCorpTradeQty(1000)">+1千</button>
                    <button class="btn-retro py-1 text-[10px] text-yellow border-yellow-800" onclick="CEO_MODULE.setCorpTradeMax()">最大</button>
                    <button class="btn-retro py-1 text-[10px] text-gray-400" onclick="CEO_MODULE.addCorpTradeQty(-100000)">-10萬</button>
                    <button class="btn-retro py-1 text-[10px] text-gray-400" onclick="CEO_MODULE.addCorpTradeQty(-10000)">-1萬</button>
                    <button class="btn-retro py-1 text-[10px] text-gray-400" onclick="CEO_MODULE.addCorpTradeQty(-1000)">-1千</button>
                    <button class="btn-retro py-1 text-[10px] text-cyan border-cyan-800" onclick="document.getElementById('corp-trade-qty').value=''; CEO_MODULE.updateCorpTradeUI();">重置</button>
                </div>
            </div>
            <div class="bg-gray-900 bg-opacity-40 p-3 border border-gray-800 text-xs space-y-1 mb-4">
                <div class="flex justify-between"><span>預估成交價 (加計滑價):</span> <span id="corp-trade-exec-price" class="text-white font-mono">\\$0</span></div>
                <div class="flex justify-between"><span>預估市場滑價:</span> <span id="corp-trade-slippage" class="text-yellow">0.00%</span></div>
                <div class="flex justify-between border-t border-gray-800 pt-1 font-bold text-sm">
                    <span id="corp-trade-total-label">預估總支出:</span>
                    <span id="corp-trade-total-cost" class="text-green-400 font-mono">\\$0</span>
                </div>
            </div>
            <div class="flex gap-3">
                <button id="btn-corp-trade-confirm" class="btn-retro flex-1 py-2 font-bold border-blue-500 text-blue-400 hover:bg-blue-900 hover:text-white disabled:border-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed" onclick="CEO_MODULE.executeCorpTrade()">確認委託</button>
                <button class="btn-retro flex-1 py-2 border-gray-600 text-gray-400 hover:border-white hover:text-white" onclick="app.closeModal('corp-trade')">取消</button>
            </div>
        </div>
        `;

        modal.classList.remove('hidden');
        this.updateCorpTradeUI();
    },

    updateCorpTradeUI() {
        if (!this.currentCorpTrade) return;
        const targetId = this.currentCorpTrade.targetId;
        const type = this.currentCorpTrade.type;
        const s = app.state.stocks[this.currentCompanyIdx];
        const targetStock = app.state.stocks.find(x => x.id === targetId);
        if (!s || !targetStock) return;

        const qtyEl = document.getElementById('corp-trade-qty');
        const qty = parseInt(qtyEl ? qtyEl.value : 0) || 0;

        let slipPct = 0;
        if (targetStock.totalShares > 0) {
            slipPct = (qty / targetStock.totalShares) * 0.3;
        }
        if (slipPct > 0.5) slipPct = 0.5;

        let execPrice = targetStock.price;
        let slippageLabel = '0.00%';
        if (type === 'buy') {
            execPrice = targetStock.price * (1.0 + slipPct);
            slippageLabel = `+\${(slipPct * 100).toFixed(2)}%`;
        } else {
            execPrice = targetStock.price * (1.0 - slipPct);
            slippageLabel = `-\${(slipPct * 100).toFixed(2)}%`;
        }
        execPrice = Math.max(1, execPrice);

        const totalCost = qty * execPrice;

        const execPriceEl = document.getElementById('corp-trade-exec-price');
        const slippageEl = document.getElementById('corp-trade-slippage');
        const totalLabelEl = document.getElementById('corp-trade-total-label');
        const totalCostEl = document.getElementById('corp-trade-total-cost');
        const confirmBtn = document.getElementById('btn-corp-trade-confirm');

        if (execPriceEl) execPriceEl.innerText = `\\$\${app.formatMoney(execPrice)}`;
        if (slippageEl) slippageEl.innerText = slippageLabel;
        if (totalLabelEl) totalLabelEl.innerText = type === 'buy' ? '預估總支出:' : '預估總回收:';
        if (totalCostEl) {
            totalCostEl.innerText = `\\$\${app.formatMoney(totalCost)}`;
            totalCostEl.className = type === 'buy' ? 'text-green-400 font-mono font-bold' : 'text-yellow font-mono font-bold';
        }

        let isValid = qty > 0;
        if (type === 'buy') {
            if (qty > this.currentCorpTrade.publicFloat) isValid = false;
            if (totalCost > s.corporateCash) isValid = false;
        } else {
            let inv = (s.corporateInvestments && s.corporateInvestments[targetId]) ? s.corporateInvestments[targetId].owned : 0;
            if (qty > inv) isValid = false;
        }

        if (confirmBtn) {
            confirmBtn.disabled = !isValid;
        }
    },

    addCorpTradeQty(amount) {
        const qtyEl = document.getElementById('corp-trade-qty');
        if (!qtyEl) return;
        let val = parseInt(qtyEl.value) || 0;
        val = Math.max(0, val + amount);
        qtyEl.value = val;
        this.updateCorpTradeUI();
    },

    setCorpTradeMax() {
        if (!this.currentCorpTrade) return;
        const targetId = this.currentCorpTrade.targetId;
        const type = this.currentCorpTrade.type;
        const s = app.state.stocks[this.currentCompanyIdx];
        const targetStock = app.state.stocks.find(x => x.id === targetId);
        if (!s || !targetStock) return;

        const qtyEl = document.getElementById('corp-trade-qty');
        if (!qtyEl) return;

        if (type === 'buy') {
            let maxQty = Math.floor(s.corporateCash / (targetStock.price * 1.15));
            maxQty = Math.min(maxQty, this.currentCorpTrade.publicFloat);
            qtyEl.value = maxQty;
        } else {
            let inv = (s.corporateInvestments && s.corporateInvestments[targetId]) ? s.corporateInvestments[targetId].owned : 0;
            qtyEl.value = inv;
        }
        this.updateCorpTradeUI();
    },

    executeCorpTrade() {
        if (!this.currentCorpTrade) return;
        const targetId = this.currentCorpTrade.targetId;
        const type = this.currentCorpTrade.type;
        const s = app.state.stocks[this.currentCompanyIdx];
        const targetStock = app.state.stocks.find(x => x.id === targetId);
        if (!s || !targetStock) return;

        const qtyEl = document.getElementById('corp-trade-qty');
        const qty = parseInt(qtyEl ? qtyEl.value : 0) || 0;
        if (qty <= 0) return;

        let slipPct = 0;
        if (targetStock.totalShares > 0) {
            slipPct = (qty / targetStock.totalShares) * 0.3;
        }
        if (slipPct > 0.5) slipPct = 0.5;

        let execPrice = targetStock.price;
        if (type === 'buy') {
            execPrice = targetStock.price * (1.0 + slipPct);
        } else {
            execPrice = targetStock.price * (1.0 - slipPct);
        }
        execPrice = Math.max(1, execPrice);
        const totalCost = qty * execPrice;

        if (type === 'buy') {
            if (totalCost > s.corporateCash) return alert("公司帳上營運資金不足！");
            if (qty > this.currentCorpTrade.publicFloat) return alert("市場上沒有足夠的流通股數供您買入！");

            s.corporateCash -= totalCost;
            if (!s.corporateInvestments) s.corporateInvestments = {};
            if (!s.corporateInvestments[targetId]) {
                s.corporateInvestments[targetId] = { owned: 0, avgCost: 0 };
            }
            const currentOwned = s.corporateInvestments[targetId].owned;
            const currentCost = s.corporateInvestments[targetId].avgCost;
            s.corporateInvestments[targetId].avgCost = ((currentCost * currentOwned) + totalCost) / (currentOwned + qty);
            s.corporateInvestments[targetId].owned += qty;

            targetStock.price = Math.max(1, targetStock.price * (1.0 + slipPct * 0.5));

            app.log(`【企業轉投資】\${s.name} 動用企業公款以每股 \\$\${app.formatMoney(execPrice)} 買進 \${targetStock.name} 共 \${app.formatMoney(qty)} 股，共斥資 \\$\${app.formatMoney(totalCost)}！`, 'text-cyan font-bold');
        } else {
            let inv = (s.corporateInvestments && s.corporateInvestments[targetId]) ? s.corporateInvestments[targetId].owned : 0;
            if (qty > inv) return alert("拋售股數不可大於公司持股庫存！");

            s.corporateCash += totalCost;
            s.corporateInvestments[targetId].owned -= qty;
            if (s.corporateInvestments[targetId].owned <= 0) {
                delete s.corporateInvestments[targetId];
            }

            targetStock.price = Math.max(1, targetStock.price * (1.0 - slipPct * 0.5));

            app.log(`【企業投資清算】\${s.name} 拋售 \${targetStock.name} 股票 \${app.formatMoney(qty)} 股，收回現金 \\$\${app.formatMoney(totalCost)}！`, 'text-yellow');
        }

        app.closeModal('corp-trade');
        app.updateUI();
        app.renderMarket();
        this.switchTab('invest');
    },

    executeMNA(targetId, buyoutCost) {
        const s = app.state.stocks[this.currentCompanyIdx];
        const target = app.state.stocks.find(x => x.id === targetId);
        if (!s || !target) return;

        if (s.corporateCash < buyoutCost) {
            return alert(`併購失敗！本公司現金不足，完成收購私有化需要 \\$\${app.formatMoney(buyoutCost)}，目前僅有 \\$\${app.formatMoney(s.corporateCash)}。`);
        }

        const inv = s.corporateInvestments && s.corporateInvestments[targetId] ? s.corporateInvestments[targetId].owned : 0;
        const heldPct = inv / target.totalShares;
        if (heldPct < 0.60) {
            return alert(`併購失敗！必須持有目標公司至少 60% 的股權才能發動私有化下市併購。目前持股比：\${(heldPct * 100).toFixed(2)}%。`);
        }

        s.corporateCash -= buyoutCost;
        const acquiredCash = target.corporateCash || 0;
        s.corporateCash += acquiredCash;

        s.monthRevenue = (s.monthRevenue || 0) + Math.floor((target.monthRevenue || 0) * 0.8);

        const playerHeld = target.owned || 0;
        const buyoutPrice = target.price * 1.2;
        const playerCompensation = playerHeld * buyoutPrice;
        if (playerHeld > 0) {
            app.state.money += playerCompensation;
            app.state.yearRevenue += playerCompensation;
            target.owned = 0;
        }

        app.state.stocks.forEach(otherCorp => {
            if (otherCorp.id !== s.id && otherCorp.corporateInvestments && otherCorp.corporateInvestments[targetId]) {
                const heldShares = otherCorp.corporateInvestments[targetId].owned;
                if (heldShares > 0) {
                    otherCorp.corporateCash += (heldShares * buyoutPrice);
                    delete otherCorp.corporateInvestments[targetId];
                }
            }
        });

        if (s.corporateInvestments && s.corporateInvestments[targetId]) {
            delete s.corporateInvestments[targetId];
        }

        target.isListed = false;
        target.price = 0;
        target.corporateCash = 0;
        target.monthRevenue = 0;
        target.name = target.name + " (已併入" + s.name + ")";
        target.isAcquired = true;
        target.workerCount = 0;
        target.employees = { cto: null, cmo: null, cfo: null };
        target.currentCEO = null;
        target.rndTeamCount = 0;
        target.rndProjects = [null, null, null];
        target.pendingCrisis = null;
        target.activeLawsuit = null;

        app.log(`【世紀強行併購】世紀巨案！\${s.name} 斥資 \\$\${app.formatMoney(buyoutCost)} 強行私有化下市併購對手 \${target.name}！接收其營收與公款現金 \\$\${app.formatMoney(acquiredCash)}，玩家個人亦獲補償 \\$\${app.formatMoney(playerCompensation)}！`, 'text-magenta font-bold animate-pulse text-lg');

        app.updateUI();
        app.renderMarket();
        this.switchTab('main');
    },

    triggerCEOHeadhunter(corpId, cost) {
        if (app.state.money < cost) {
            app.log("【獵頭失敗】您的個人帳戶現金不足以支付 CEO 獵頭顧問委託費用！", "text-red-500 font-bold");
            return;
        }
        const s = app.state.stocks.find(x => x.id === corpId);
        if (!s) return;

        app.state.money -= cost;
        if (!s.ceoCandidates) s.ceoCandidates = [];

        const firstNames = ['建國', '台銘', '忠謀', '明相', '志明', '家豪', '俊傑', '信宏', '柏宇', '冠廷', '雅婷', '怡君', '佳穎', '淑芬', '佩珊', '宗翰', '家維', '柏翰', '承恩', '宇軒', '哲瑋', '志強', '俊宏', '志偉', '欣妤'];
        const lastNames = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '洪', '郭', '邱', '曾', '廖', '賴', '徐', '周', '葉', '蘇', '莊', '呂'];
        const traitKeys = Object.keys(CEO_CONFIG.traits);

        let newCandidates = [];
        for (let i = 0; i < 3; i++) {
            let ln = lastNames[Math.floor(Math.random() * lastNames.length)];
            let fn = firstNames[Math.floor(Math.random() * firstNames.length)];
            let name = ln + fn;
            let archetype = Math.random();

            let stats = {
                leadership: Math.floor(Math.random() * 50) + 30,
                rd: Math.floor(Math.random() * 50) + 30,
                finance: Math.floor(Math.random() * 50) + 30,
                marketing: Math.floor(Math.random() * 50) + 30,
                operations: Math.floor(Math.random() * 50) + 30
            };

            if (archetype < 0.2) stats.rd += 25;
            else if (archetype < 0.4) stats.finance += 25;
            else if (archetype < 0.6) stats.marketing += 25;
            else if (archetype < 0.8) stats.operations += 25;
            else stats.leadership += 25;

            for (let k in stats) {
                if (stats[k] > 100) stats[k] = 100;
            }

            let totalStats = Object.values(stats).reduce((a, b) => a + b, 0);
            let statBonus = Math.floor(Math.pow(Math.max(0, totalStats - 150) / 50, 3) * 500000);
            let randomBonus = Math.floor(Math.random() * 500000);
            let baseSalary = 3000000 + statBonus + randomBonus;

            let traits = [];
            let numTraits = Math.random() > 0.6 ? 2 : 1;
            for (let j = 0; j < numTraits; j++) {
                let rt = traitKeys[Math.floor(Math.random() * traitKeys.length)];
                if (!traits.includes(rt)) traits.push(rt);
            }

            newCandidates.push({
                id: 'CEO_CAND_' + Date.now() + '_' + i,
                name, stats, traits, salary: baseSalary
            });
        }

        s.ceoCandidates = newCandidates;
        app.log(`【獵頭委託】支付服務費 \\$\${app.formatMoney(cost)}，成功委託頂級獵頭顧問，為 \${s.name} 遞交了三位精選 CEO 執行長候選人推薦名單！`, "text-cyan font-bold");
        app.updateUI();
        this.switchTab('hr');
    },

    hireCEO(candidateId) {
        const s = app.state.stocks[this.currentCompanyIdx];
        if (!s || !s.ceoCandidates) return;

        const candidate = s.ceoCandidates.find(c => c.id === candidateId);
        if (!candidate) return;

        const oldCeoName = s.currentCEO ? s.currentCEO.name : '原執行長';

        s.currentCEO = candidate;
        s.playerRole = '董事長';
        s.ceoCandidates = [];
        s.spillover = Math.min(1.0, (s.spillover || 0.1) + 0.08);

        app.log(`【人事委任】\text{\${s.name}} 董事會通過人事案！正式聘任 \text{\${candidate.name}} 出任新任 CEO！(年薪 \\$\${app.formatMoney(candidate.salary)})，玩家退居董事長監管。`, 'text-cyan font-bold animate-pulse');
        app.updateUI();
        this.switchTab('hr');
    },

    cancelCEOHeadhunter(corpId) {
        const s = app.state.stocks.find(x => x.id === corpId);
        if (s) {
            s.ceoCandidates = [];
        }
        this.switchTab('hr');
    },

    fireCEO() {
        const s = app.state.stocks[this.currentCompanyIdx];
        if (!s.currentCEO) return;

        if (s.currentCEO.id === 'PLAYER_CEO') {
            s.currentCEO = null;
            s.playerRole = '董事長';
            app.log(`【人事命令】您主動卸任了 \text{\${s.name}} 的 CEO 職務，目前執行長職位空缺中。`, 'text-yellow');
        } else {
            let severance = Math.floor(s.currentCEO.salary * 0.1);
            if (s.corporateCash >= severance) {
                s.corporateCash -= severance;
                const firedName = s.currentCEO.name;
                s.currentCEO = null;
                s.playerRole = '董事長';
                s.spillover = Math.max(0, (s.spillover || 0.1) - 0.05);
                app.log(`【人事地震】\${s.name}宣佈解僱執行長\${firedName}，支付資遣費 \\$\${app.formatMoney(severance)}。`, 'text-yellow');
            } else {
                app.log('【人資】公司帳上現金不足以支付執行長的資遣費，無法完成人事更替！', 'text-red-500 font-bold');
                return;
            }
        }
        app.updateUI();
        this.switchTab('hr');
    },

    currentTab: 'main', // 新增：紀錄當前開啟的頁籤，預設為 main
    // [新增] 動態取得企業專屬研發專案名稱陣列 (結合 COMPANY_PRODUCTS 與通用板塊回退機制)
    getProjectNames(corp) {
        if (typeof COMPANY_PRODUCTS !== 'undefined' && COMPANY_PRODUCTS[corp.id]) {
            const prod = COMPANY_PRODUCTS[corp.id];
            const past = prod.past || [];
            const future = prod.future || [];

            return [
                past[0] || '概念設計草稿',
                past[1] || '初期原型驗證',
                past[2] || '產品小幅優化',
                future[0] || '次世代主打旗艦',
                future[1] || '革命性突破技術',
                future[future.length - 1] || '終極專利登月計畫'
            ];
        }
        // 若無專屬自訂產品，回退至產業板塊預設名稱
        return SECTOR_PROJECT_NAMES[corp.sector] || SECTOR_PROJECT_NAMES['electronics'];
    },

    // 新增：提供給外部 (engine.js) 呼叫的刷新函數
    refresh() {
        const modal = document.getElementById('tab-ceo');
        // 只有當營運面板是顯示狀態時才進行刷新，節省效能
        if (modal && !modal.classList.contains('hidden')) {
            this.switchTab(this.currentTab);
        }
    },
    // [新增] 開啟研發突發事件決策 Modal
    openRDEventModal(corpId, teamSlotIdx) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.rndProjects || !corp.rndProjects[teamSlotIdx]) return;

        const proj = corp.rndProjects[teamSlotIdx];
        if (!proj.pendingEvent) return;

        const event = proj.pendingEvent;
        const typeDef = CEO_CONFIG.projectTypes[proj.type];
        const boostCost = Math.floor(typeDef.baseCost * 0.5);

        const contentEl = document.getElementById('rd-event-content');
        if (!contentEl) return;

        contentEl.innerHTML = `
            <div class="border border-yellow-600 bg-black p-3 mb-4 animate-pulse">
                <div class="flex items-center gap-2">
                    <span class="bg-yellow-600 text-black text-xs font-bold px-1.5 py-0.5">緊急狀況</span>
                    <span class="text-white text-xs font-bold">[團隊 #${teamSlotIdx + 1}] ${proj.name}</span>
                </div>
                <div class="text-yellow font-bold text-lg mt-2">${event.name}</div>
                <div class="text-xs text-gray-300 mt-1">${event.desc}</div>
            </div>
            
            <div class="space-y-3">
                <div class="border border-gray-800 bg-gray-900 p-2.5">
                    <div class="text-xs font-bold text-green-400 mb-1">方案 A：追加 50% 預算突破瓶頸</div>
                    <div class="text-[10px] text-gray-400">斥資 <span class="text-red-400 font-bold">$${app.formatMoney(boostCost)}</span> 增購頂級開發套件與外包支援。克服難關後產品最終品質預計提升。</div>
                    <button class="btn-retro w-full mt-2 py-1 text-xs border-green-500 text-green-400 hover:bg-green-900 hover:text-white font-bold" onclick="CEO_MODULE.resolveRDEvent('${corp.id}', ${teamSlotIdx}, 'boost'); app.closeModal('rd-event');">批准追加預算</button>
                </div>
                
                <div class="border border-gray-800 bg-gray-900 p-2.5">
                    <div class="text-xs font-bold text-cyan mb-1">方案 B：轉換賽道 (Pivot 機制)</div>
                    <div class="text-[10px] text-gray-400">砍掉重練並轉換底層架構。保留 30% 的前期開發模組成果，研發進度條退回至剩餘 70% 重新起跑。</div>
                    <button class="btn-retro w-full mt-2 py-1 text-xs border-cyan text-cyan hover:bg-cyan-900 hover:text-white font-bold" onclick="CEO_MODULE.resolveRDEvent('${corp.id}', ${teamSlotIdx}, 'pivot'); app.closeModal('rd-event');">啟動 Pivot 轉向</button>
                </div>

                <div class="border border-gray-800 bg-gray-900 p-2.5">
                    <div class="text-xs font-bold text-red-500 mb-1">方案 C：硬著頭皮推出半成品</div>
                    <div class="text-[10px] text-gray-400">略過壓力測試強制完工送審！能立刻收割營收並炒作股價，但後續極高機率引發市場公關危機與退貨潮。</div>
                    <button class="btn-retro w-full mt-2 py-1 text-xs border-red-500 text-red-500 hover:bg-red-900 hover:text-white font-bold" onclick="CEO_MODULE.resolveRDEvent('${corp.id}', ${teamSlotIdx}, 'buggy'); app.closeModal('rd-event');">強行完工送交審批</button>
                </div>
            </div>
        `;

        document.getElementById('modal-rd-event').classList.remove('hidden');
    },
    currentCompanyIdx: null,
    talentPool: [], // 人才庫
    showCeoOnly: false, // [新增] 過濾器狀態
    financeViewRange: 'month',
    // [關鍵新增] 全球宏觀景氣循環追蹤器
    currentBusinessCycle: { main: 'semi', mainName: '半導體', related: ['electronics', 'software_ai'], relatedNames: ['消費性電子', '軟體與AI'], year: 1988 },

    // [新增/修改] 處理研發隨機事件的最終裁示
    resolveRDEvent(corpId, teamSlot, decision) {
        const s = app.state.stocks.find(x => x.id === corpId);
        if (!s || !s.rndProjects[teamSlot]) return;

        const proj = s.rndProjects[teamSlot];
        const typeDef = CEO_CONFIG.projectTypes[proj.type];

        if (decision === 'boost') {
            // 追加 50% 預算突破瓶頸
            const cost = Math.floor(typeDef.baseCost * 0.5);
            if (s.corporateCash < cost) {
                app.log(`【預算不足】公司帳上現金不足以支付追加預算 $${app.formatMoney(cost)}，只能勉強維持原方案開發。`, 'text-red-500 font-bold');
                proj.pendingEvent = null;
                this.switchTab('rnd');
                return;
            }
            s.corporateCash -= cost;
            s.monthExpense = (s.monthExpense || 0) + cost;
            proj.qualityBonus = (proj.qualityBonus || 0) + 15; // 額外品質加成
            proj.pendingEvent = null; // 解除暫停，恢復開發
            app.log(`【突破瓶頸】${s.name} 董事長批准追加預算 $${app.formatMoney(cost)}，研發團隊士氣大振，成功克服技術難關！(預期品質提升)`, 'text-green-400');
        }
        else if (decision === 'pivot') {
            // 轉換賽道 (Pivot)：保留 30% 已開發進度，重新計算週期
            proj.daysLeft = Math.floor(typeDef.durationDays * 0.7);
            proj.pendingEvent = null;
            app.log(`【轉換賽道】${s.name} 宣佈啟動 Pivot 轉軸機制，迅速調整研發方向以迎合最新市場趨勢！`, 'text-cyan');
        }
        else if (decision === 'buggy') {
            // 硬著頭皮推出半成品：強制立刻結束研發送交發布，但帶有高風險標記
            proj.status = 'pending_review';
            proj.quality = Math.max(10, Math.floor(Math.random() * 35)); // 品質鎖定在極低水準
            proj.isBuggy = true; // 標記為 Bug 版半成品
            proj.pendingEvent = null;
            app.log(`【冒險發布】${s.name} 高層無視工程團隊警告，強行將充滿潛在缺陷的半成品送交最終審批！`, 'text-red-500 font-bold animate-pulse');
        }

        // 刷新畫面與 Modal 顯示
        this.switchTab('rnd');
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(s.corporateCash)}`;
    },

    performIPO() {
        const s = app.state.stocks[this.currentCompanyIdx];
        const releasePct = parseInt(document.getElementById('ipo-pct-range').value) / 100;

        // 1. 計算申購熱度 (依據過去產品成功次數與市場狀態)
        // 基本熱度 1.0，每個成功產品 +0.2，牛市 +0.3，熊市 -0.3
        let demandHype = 1.0 + (s.productSuccessCount * 0.2);
        if (app.state.marketState === 'bull') demandHype += 0.3;
        if (app.state.marketState === 'bear') demandHype -= 0.3;
        demandHype *= (0.8 + Math.random() * 0.4); // 隨機隨動 80%~120%

        // 2. 決定企業估值 (Operating Status)：依據帳上現金與過往研發成功次數計算
        // 現金代表基本盤，產品成功次數代表溢價倍數 (Multiplier)
        const successBonus = 1 + (s.productSuccessCount * 0.5); // 每個成功產品增加 50% 估值權重
        const totalValuation = s.corporateCash * successBonus * demandHype;

        // 3. 決定 IPO 初始價格 (根據市場熱度，設定在 50~200 元的合理發行區間)
        const ipoPrice = Math.max(10, Math.floor(50 * demandHype));

        // 4. 股權重組 (Capital Restructuring)：根據「估值 / 股價」反推上市時的總股數
        // 這確保了上市時的股價能反映公司營運實力與市場熱度的平衡
        const newTotalShares = Math.max(1000000, Math.floor(totalValuation / ipoPrice));
        s.totalShares = newTotalShares;
        s.owned = newTotalShares; // 上市瞬間將玩家原本的 100% 股權對齊新的總股數

        // 5. 股權清算 (依據玩家設定的釋出比例)
        const sharesToSell = Math.floor(s.totalShares * releasePct);
        const cashRaised = sharesToSell * ipoPrice;
        if (sharesToSell >= s.owned) return alert("釋出股數不可大於您的持有股數！");

        // 玩家更新：失去部分股票，換得現金入帳
        s.owned -= sharesToSell; // 原本的這句可能導致計算錯誤，如果是 sharesToSell 等於 s.owned 就會變 0
        app.state.money += cashRaised;
        app.state.yearRevenue += cashRaised;

        // 公司更新：上市狀態轉變
        s.isListed = true;
        s.price = ipoPrice;
        s.lastPrice = ipoPrice;
        s.basePrice = ipoPrice;
        s.avgCost = 0; // IPO 後玩家持股成本重新計算 (或是設為0視為淨賺)
        s.playerRole = s.owned / s.totalShares >= 0.5 ? 'CEO (創辦人)' : '大股東';

        // 4. 發布新聞日誌
        const overSub = (demandHype * 10).toFixed(1);
        app.log(`【IPO 成功】${s.name} 正式掛牌！超額認購達 ${overSub} 倍。`, 'text-red-500 font-bold animate-pulse');
        app.log(`👉 您釋出 ${(releasePct * 100).toFixed(0)}% 股權，以每股 $${ipoPrice} 籌得現金 $${app.formatMoney(cashRaised)}！`, 'text-cyan');

        // 5. 介面更新
        app.updateUI();
        app.updateChartSelect();
        app.renderMarket();
        this.switchTab('main');
    },
    // [修改] 執行現金增資 (SEO) - 加入公告邏輯
    executeSEO() {
        const s = app.state.stocks[this.currentCompanyIdx];
        const sharesInput = document.getElementById('cap-seo-shares');
        const newShares = parseInt(sharesInput ? sharesInput.value : 0);

        if (!s.isListed) return alert("公司尚未上市，無法執行現金增資 (SEO)！");
        if (isNaN(newShares) || newShares <= 0) return alert("請輸入有效的增資股數！");

        const subscriptionPrice = s.price * 0.9;
        const oldMarketCap = s.totalShares * s.price;
        const cashRaised = newShares * subscriptionPrice;
        const dilutedPrice = (oldMarketCap + cashRaised) / (s.totalShares + newShares);

        s.totalShares += newShares;
        s.corporateCash += cashRaised;
        s.price = Math.max(1, dilutedPrice);

        // 新增：寫入公司公告
        if (!s.companyNews) s.companyNews = [];
        s.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【資本申報】公司完成現金增資 (SEO)，發行 ${app.formatMoney(newShares)} 股，籌得營運資金 $${app.formatMoney(cashRaised)}。`,
            isGood: true
        });

        app.log(`【資本操作】${s.name} 完成增資，籌得 $${app.formatMoney(cashRaised)}。`, 'text-blue-400');
        app.updateUI();
        app.renderMarket();
        this.switchTab('cap');
    },
    injectPrivateCapital(amount) {
        const s = app.state.stocks[this.currentCompanyIdx];
        if (app.state.money < amount) return alert("您的個人存款不足！");

        app.state.money -= amount;
        s.corporateCash += amount;

        app.log(`【私有化增資】您向 ${s.name} 注入了 $${app.formatMoney(amount)} 個人資金。`, 'text-yellow');

        // 確保玩家畫面上方的總資金刷新
        if (typeof app.updateUI === 'function') app.updateUI();

        // 更新 CEO 面板頂部的企業帳上現金顯示
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(s.corporateCash)}`;

        this.switchTab('main'); // 重新渲染主面板
    },

    // [新增] 讀取輸入框的自訂金額並執行注資
    injectPrivateCapitalCustom() {
        const amountEl = document.getElementById('private-inject-amount');
        if (!amountEl) return;
        const amount = parseFloat(amountEl.value);
        if (isNaN(amount) || amount <= 0) {
            return alert("請輸入有效的注資金額！");
        }
        this.injectPrivateCapital(amount);
    },
    // [修改] 執行庫藏股註銷 - 增加「流通股檢查」防止持股超過 100%
    executeBuyback() {
        const s = app.state.stocks[this.currentCompanyIdx];
        const sharesInput = document.getElementById('cap-buyback-shares');
        const buyShares = parseInt(sharesInput ? sharesInput.value : 0);

        if (!s.isListed) return alert("私有化公司無法執行庫藏股註銷！");
        if (isNaN(buyShares) || buyShares <= 0) return alert("請輸入有效的買回股數！");

        // [關鍵修復] 檢查市場流通量 (Total - Owned)
        const publicFloat = s.totalShares - s.owned;
        if (buyShares > publicFloat) {
            return alert(`收購失敗！公司只能從市場流通盤買回股票。目前市場流通僅剩 ${app.formatMoney(publicFloat)} 股，不足以支應買回計畫。`);
        }

        if (buyShares >= s.totalShares * 0.5) return alert("法律規定庫藏股買回上限不可超過總股本 50%！");

        const totalCost = buyShares * s.price;
        if (s.corporateCash < totalCost) return alert(`公司現金不足！買回需要 $${app.formatMoney(totalCost)}。`);

        const oldMarketCap = s.totalShares * s.price;
        const newTotalShares = s.totalShares - buyShares;
        const newPrice = ((oldMarketCap - totalCost) / newTotalShares) * 1.02;

        s.totalShares = newTotalShares;
        s.corporateCash -= totalCost;
        s.price = Math.max(1, newPrice);

        // 寫入公告
        if (!s.companyNews) s.companyNews = [];
        s.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【資本申報】公司執行庫藏股買回並註銷共 ${app.formatMoney(buyShares)} 股，旨在維護股東權益與提升每股價值。`,
            isGood: true
        });

        app.log(`【資本操作】${s.name} 註銷 ${app.formatMoney(buyShares)} 股。`, 'text-green-400');
        app.updateUI();
        app.renderMarket();
        this.switchTab('cap');
    },

    // [新增] 切換過濾器並重繪選單
    toggleCeoFilter(val) {
        this.showCeoOnly = val;
        this.renderCompanySelector();
    },

    // 切換目標公司
    switchCompany(idxStr) {
        const idx = parseInt(idxStr);
        if (!isNaN(idx)) {
            this.openDashboard(idx);
        }
    },
    // [新增] 切換財務報表顯示區間並重新渲染
    changeFinanceRange(range) {
        this.financeViewRange = range;
        this.switchTab('main');
    },

    // [修改] 稅務估算工具：套用平滑漸進曲線最高達 50% 的所得稅率
    calculateTaxEstimate(preTaxProfit, corp) {
        if (preTaxProfit <= 0) return 0;

        // 漸進曲線演算法：起步 10%，隨著淨利潤增加，平滑曲線上揚趨近極限 50%
        // 平滑基準規模 (Scale) 設為 1 億元
        const scale = 100000000;
        const effectiveRate = 0.10 + 0.40 * (1 - (scale / (scale + preTaxProfit)));
        const rawTax = preTaxProfit * effectiveRate;

        // CFO 節稅加成 (每點加成抵免 1.5% 稅額，極限減稅上限設為 45%)
        const cfo = corp.employees?.cfo;
        const cfoBonus = cfo ? (cfo.bonus !== undefined ? cfo.bonus : Math.floor((cfo.skill || 0) / 8)) : 0;
        const taxOptimizationRate = Math.min(0.45, cfoBonus * 0.015);

        return Math.floor(rawTax * (1 - taxOptimizationRate));
    },

    // [新增] 處理玩家針對企業黑天鵝危機的最終裁示
    resolveCrisis(corpId, decision) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.pendingCrisis) return;

        const c = corp.pendingCrisis;

        if (decision === 'settle') {
            if (corp.corporateCash < c.settlementCost) return;

            corp.corporateCash -= c.settlementCost;
            corp.monthExpense = (corp.monthExpense || 0) + c.settlementCost;
            corp.pendingCrisis = null;

            app.log(`【危機解除】董事長雷厲風行！${corp.name} 支付天價和解金 $${app.formatMoney(c.settlementCost)} 成功平息「${c.name}」風波，保住市場商譽！`, 'text-green-400 font-bold');
        } else if (decision === 'court') {
            corp.activeLawsuit = {
                name: c.name,
                monthlyCost: c.monthlyCost,
                monthsLeft: c.duration
            };
            corp.pendingCrisis = null;

            app.log(`【進入纏訟】${corp.name} 拒絕妥協，針對「${c.name}」正式啟動法律戰！未來 ${c.duration} 個月內產品營收受衝擊減半，並按月支付法務費。`, 'text-magenta font-bold');
        }

        // 重新渲染畫面以即時反映變化
        this.switchTab('main');
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
    },

    calcFinanceData(corp, range) {
        let rev = 0, exp = 0, taxInHistory = 0;
        const history = corp.financeHistory || [];
        const currentYear = app.state.date.getFullYear();

        if (range === 'month') {
            rev = corp.monthRevenue || 0;
            exp = corp.monthExpense || 0;
        } else if (range === '6m') {
            rev = corp.monthRevenue || 0;
            exp = corp.monthExpense || 0;
            // 修正屬性名稱：相容 h.rev/h.revenue 與 h.exp/h.expense
            history.slice(-5).forEach(h => {
                rev += (h.revenue !== undefined ? h.revenue : (h.rev || 0));
                exp += (h.expense !== undefined ? h.expense : (h.exp || 0));
                taxInHistory += (h.tax || 0);
            });
        } else if (range === '12m') {
            rev = corp.monthRevenue || 0;
            exp = corp.monthExpense || 0;
            history.slice(-11).forEach(h => {
                rev += (h.revenue !== undefined ? h.revenue : (h.rev || 0));
                exp += (h.expense !== undefined ? h.expense : (h.exp || 0));
                taxInHistory += (h.tax || 0);
            });
        } else if (range === 'lastYear') {
            const targetYear = currentYear - 1;
            const yearRecords = history.filter(h => h.year === targetYear);
            yearRecords.forEach(h => {
                rev += (h.revenue !== undefined ? h.revenue : (h.rev || 0));
                exp += (h.expense !== undefined ? h.expense : (h.exp || 0));
                taxInHistory += (h.tax || 0);
            });
        }

        // 計算當月「預計」產生的應繳稅額 (若當月營利為正才計稅)
        let currentMonthTaxEstimate = 0;
        if (range !== 'lastYear') {
            const currentProfit = (corp.monthRevenue || 0) - (corp.monthExpense || 0);
            if (currentProfit > 0) {
                currentMonthTaxEstimate = this.calculateTaxEstimate(currentProfit, corp);
            }
        }

        // 總稅金 = 歷史已繳 + 當月預計
        const totalTax = taxInHistory + currentMonthTaxEstimate;

        return {
            rev,
            exp,
            tax: totalTax,
            // 💡 關鍵修復：淨利必須扣除「總稅金(totalTax)」，而不是只扣當月預估稅
            profit: rev - exp - totalTax
        };
    },

    // [新增] 每年執行一次的產業景氣輪動抽籤引擎
    rollBusinessCycle(year) {
        // 嚴謹定義遊戲內建的 13 個板塊及其產業鏈上下游關聯
        const sectors = [
            { id: 'semi', name: '半導體', related: ['electronics', 'software_ai'] },
            { id: 'electronics', name: '消費性電子', related: ['semi', 'game'] },
            { id: 'software_ai', name: '軟體與AI', related: ['semi', 'telecom'] },
            { id: 'game', name: '電子遊戲', related: ['electronics', 'software_ai'] },
            { id: 'telecom', name: '網通電信', related: ['software_ai', 'electronics'] },
            { id: 'auto', name: '傳統與新能源車', related: ['electronics', 'energy'] },
            { id: 'finance', name: '金融保險', related: ['realestate', 'retail'] },
            { id: 'realestate', name: '營建不動產', related: ['finance', 'energy'] },
            { id: 'retail', name: '貿易百貨與零售', related: ['food', 'transport'] },
            { id: 'food', name: '食品工業', related: ['retail'] },
            { id: 'pharma', name: '生技製藥', related: ['food', 'software_ai'] },
            { id: 'transport', name: '航運與物流', related: ['energy', 'retail'] },
            { id: 'energy', name: '綠能與環保', related: ['transport', 'auto'] }
        ];

        // 隨機抽選一個作為當年度核心爆發主導產業
        const mainObj = sectors[Math.floor(Math.random() * sectors.length)];
        this.currentBusinessCycle = {
            main: mainObj.id,
            mainName: mainObj.name,
            related: mainObj.related,
            relatedNames: mainObj.related.map(rId => sectors.find(s => s.id === rId)?.name || rId),
            year: year
        };

        // 發布全域終端機日誌公告
        if (typeof app !== 'undefined' && app.log) {
            app.log(`【宏觀景氣循環】${year} 年度產業風向定調！主導風口板塊：【${this.currentBusinessCycle.mainName}】(獲利 120%)；外溢連帶受惠：【${this.currentBusinessCycle.relatedNames.join('、')}】(獲利 110%)；其餘產業步入冷卻期 (獲利 80%)。`, 'text-yellow font-bold animate-pulse');
        }
    },

    // [新增] 查詢特定板塊當前的景氣獲利加成倍率
    getSectorProfitMultiplier(sectorId) {
        if (!this.currentBusinessCycle || !this.currentBusinessCycle.main) return 1.0;
        if (sectorId === this.currentBusinessCycle.main) return 1.2; // 主導產業 120%
        if (this.currentBusinessCycle.related.includes(sectorId)) return 1.1; // 相關產業 110%
        return 0.8; // 其餘產業 80%
    },

    // [升級版] 渲染多公司切換選單 (支援職位標籤與 CEO 過濾)
    renderCompanySelector() {
        const container = document.getElementById('ceo-company-selector-container');
        const selector = document.getElementById('ceo-company-select');
        if (!container || !selector) return;

        // 1. 找出所有玩家擔任 CEO 或董事長的公司
        let ceoCompanies = app.state.stocks.map((s, idx) => ({ s, idx }))
            .filter(item => item.s.playerRole && (item.s.playerRole.includes('CEO') || item.s.playerRole.includes('董事長')));

        // 2. [核心邏輯] 執行 CEO 職位過濾
        if (this.showCeoOnly) {
            ceoCompanies = ceoCompanies.filter(item => item.s.playerRole.includes('CEO'));
        }

        // 3. 只有在擁有符合資格的公司時顯示
        if (ceoCompanies.length > 0) {
            container.classList.remove('hidden');
            let html = '';
            ceoCompanies.forEach(item => {
                const isSelected = (item.idx === this.currentCompanyIdx) ? 'selected' : '';
                // [新增] 根據職位給予視覺標籤，方便快速辨識
                const roleTag = item.s.playerRole.includes('CEO') ? '【CEO】' : '【董事長】';
                html += `<option value="${item.idx}" ${isSelected}>${roleTag} ${item.s.name}</option>`;
            });
            selector.innerHTML = html;
        } else {
            // 如果開了過濾器導致名單為空，給予提示
            if (this.showCeoOnly) {
                selector.innerHTML = '<option value="">(目前無親自經營企業)</option>';
            } else {
                container.classList.add('hidden');
                selector.innerHTML = '';
            }
        }
    },


    // [新增] 針對特定高階職缺發動定向獵頭尋才
    triggerExecutiveHeadhunter(corpId, role, cost) {
        if (app.state.money < cost) {
            app.log("【獵頭失敗】您的個人帳戶現金不足以支付獵頭委託費用！", "text-red-500 font-bold");
            return;
        }
        const s = app.state.stocks.find(x => x.id === corpId);
        if (!s) return;

        app.state.money -= cost;
        if (!s.executiveCandidates) s.executiveCandidates = { cto: [], cmo: [], cfo: [] };

        // 獵頭精選：針對該職缺產生 3 位能力卓越的專屬候選人
        const firstNames = ['艾倫', '馬克', '雪莉', '大衛', '莎拉', '詹姆斯', '凱文', '安娜', '傑克', '莉莉'];
        const lastNames = ['史密斯', '強森', '威廉斯', '布朗', '李', '王', '張', '陳', '林', '戴維斯'];
        const traitKeys = Object.keys(CEO_CONFIG.traits);

        let newCandidates = [];
        for (let i = 0; i < 3; i++) {
            let name = lastNames[Math.floor(Math.random() * lastNames.length)] + firstNames[Math.floor(Math.random() * firstNames.length)];
            // 定向獵頭找來的主管能力通常較為優秀，設定在 70~99 之間
            let skill = Math.floor(Math.random() * 30) + 70;
            let trait = traitKeys[Math.floor(Math.random() * traitKeys.length)];
            // [關鍵新增] 職能專屬加成：能力/8。例如 80分 => +10 企業權重
            let bonus = Math.floor(skill / 8);
            let baseSalary = skill * 30000;
            let stockDemand = Math.floor(baseSalary / 10);

            newCandidates.push({
                id: 'EX_' + Date.now() + '_' + i,
                name, role, skill, trait, bonus, salary: baseSalary, stockDemand
            });
        }

        s.executiveCandidates[role] = newCandidates;
        const roleName = role === 'cto' ? '技術長 (CTO)' : (role === 'cmo' ? '行銷長 (CMO)' : '財務長 (CFO)');
        app.log(`【獵頭委託】支付服務費 $${app.formatMoney(cost)}，獵頭公司迅速為您的企業遞交了三位精選 ${roleName} 候選人名單！`, "text-cyan font-bold");

        app.updateUI();
        this.switchTab('hr');
    },

    // [修改] 支援指定職缺與專屬候選人 ID 的正式聘用邏輯
    hireExecutive(role, candidateId, payType) {
        const s = app.state.stocks[this.currentCompanyIdx];
        if (!s || !s.executiveCandidates || !s.executiveCandidates[role]) return;

        const candidate = s.executiveCandidates[role].find(c => c.id === candidateId);
        if (!candidate) return;

        // 若該職位原本已經有人，執行資遣解職程序 (需支付一個月的薪水作為資遣費)
        if (s.employees[role]) {
            let severance = s.employees[role].salary;
            if (s.corporateCash >= severance) {
                s.corporateCash -= severance;
                app.log(`【人事交接】${s.name} 依法解雇原任主管並自企業帳戶扣除資遣費 $${app.formatMoney(severance)}。`, "text-gray-400");
            } else {
                app.log("【人資警告】公司帳上營運資金不足以支付原任主管的資遣費，無法完成人事更替！", "text-red-500 font-bold");
                return;
            }
        }

        candidate.payType = payType;
        s.employees[role] = candidate;

        // 聘用成功後，清空該職缺的推薦暫存名單結案
        s.executiveCandidates[role] = [];

        const roleTitle = role.toUpperCase();
        app.log(`【人事發布】經由獵頭定向引薦，${s.name} 董事會正式委任 ${candidate.name} 出任新任 ${roleTitle}！(薪酬：純現金月結)`, 'text-cyan font-bold animate-pulse');

        app.updateUI();
        this.switchTab('hr');
    },

    // [新增] 取消委託 / 隱藏指定職缺的候選人名單
    cancelExecutiveHeadhunter(corpId, role) {
        const s = app.state.stocks.find(x => x.id === corpId);
        if (s && s.executiveCandidates) {
            s.executiveCandidates[role] = [];
        }
        this.switchTab('hr');
    },

    fireExecutive(role) {
        const s = app.state.stocks[this.currentCompanyIdx];
        if (!s.employees[role]) return;

        let severance = s.employees[role].salary;
        if (s.corporateCash >= severance) {
            s.corporateCash -= severance;
            app.log(`【人事地震】${s.name} 宣佈解雇 ${role.toUpperCase()} ${s.employees[role].name}，支付資遣費 $${app.formatMoney(severance)}。`, 'text-yellow');
            s.employees[role] = null;
            s.spillover -= 0.05; // 開除高管會引發短期股價動盪
            this.switchTab('hr');
        } else {
            app.log('【人資】公司帳上現金不足以支付資遣費！', 'text-red-500 font-bold');
        }
    },

    // [新增] 處理基層員工增減
    manageWorkforce(corpId, change, unitCost) {
        const s = app.state.stocks.find(x => x.id === corpId);
        if (!s) return;

        // 【安全修復】點擊操作前自動過濾並修復存檔殘留的 NaN 污染
        if (s.workerCount === undefined || isNaN(s.workerCount)) {
            s.workerCount = 200;
        }

        if (change > 0) {
            // 招聘邏輯
            const totalCost = change * unitCost;
            if (s.corporateCash < totalCost) {
                app.log("【招募失敗】公司帳上現金不足以支付招募規費與行政成本！", "text-red-500");
                return;
            }
            s.corporateCash -= totalCost;
            s.workerCount += change;
            app.log(`【人資擴編】${s.name} 成功擴招 ${change} 名員工，總編制達 ${s.workerCount} 人。`, "text-green-400");
        } else {
            // 裁員邏輯
            const absChange = Math.abs(change);
            if (s.workerCount < absChange) return;

            const ceoTraits = (s.currentCEO && s.currentCEO.traits) || [];
            // ⭕ 【鐵血手腕】判斷：若具備該特質，資遣費為 0
            const totalSeverance = ceoTraits.includes('iron_fist') ? 0 : (absChange * unitCost);

            if (s.corporateCash < totalSeverance) {
                app.log("【裁員受阻】公司無法支付資遣費，引發勞資爭議！", "text-red-600 font-bold");
                return;
            }
            // ⭕ 乾淨扣除單一正確的 totalSeverance
            s.corporateCash -= totalSeverance;
            s.monthExpense += totalSeverance;
            s.workerCount -= absChange;
            s.spillover -= 0.03; // 裁員引發社會負面觀感，略微降低熱度
            app.log(`【組織重組】${s.name} 精簡人力，裁員 ${absChange} 人並支付補償金。`, "text-yellow");
        }

        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(s.corporateCash)}`;
        this.switchTab('hr');
    },

    // 開啟 CEO 儀表板
    openDashboard(idx) {

        if (idx === -1 || !app.state.stocks[idx]) return; // 安全檢查，防止找不到公司
        this.currentCompanyIdx = idx;
        const s = app.state.stocks[idx];

        // [修正] 確保收購的公司被正確認定為已上市
        if (s.isListed === undefined) s.isListed = true;

        // [修正] 確保收購的公司具備營運資金 (如果是收購的，給予市值的 1% 作為初始企業現金)
        if (s.corporateCash === undefined || s.corporateCash === 0) {
            s.corporateCash = Math.floor(s.totalShares * s.price * 0.01);
        }

        if (!s.employees) s.employees = { cto: null, cmo: null, cfo: null };
        if (s.activeProject === undefined) s.activeProject = null;


        app.state.currentCompanyIdx = idx;

        // 安全地填入 UI 數據，防止因元素不存在而崩潰
        const nameEl = document.getElementById('ceo-company-name');
        const sharesEl = document.getElementById('ceo-total-shares');
        const cashEl = document.getElementById('ceo-company-cash');

        if (nameEl) nameEl.innerText = s.name;
        if (sharesEl) sharesEl.innerText = app.formatMoney(s.totalShares);
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(s.corporateCash)}`;

        // 渲染下拉選單 (檢查是否有多家公司)
        this.renderCompanySelector();

        // 渲染分頁內容
        this.switchTab('main');
    },

    // 頁籤切換渲染邏輯 (內建董事長唯讀監控防護)
    switchTab(tabId) {
        // 安全重定向防禦：研發中心已被移除，所有舊有的 rnd 頁籤載入請求自動轉向核心營運 ops
        if (tabId === 'rnd') {
            tabId = 'ops';
        }
        this.currentTab = tabId; // 新增：切換時更新當前頁籤紀錄
        const tabs = ['main', 'flow', 'hr', 'ops', 'cap', 'invest'];

        tabs.forEach(t => {
            const btn = document.getElementById(`btn-ceo-tab-${t}`);
            if (btn) {
                btn.classList.remove('bg-red-900', 'bg-opacity-40', 'text-red-400', 'border-red-500');
                btn.classList.add('text-gray-500', 'border-gray-700');
            }
        });

        const activeBtn = document.getElementById(`btn-ceo-tab-${tabId}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-500', 'border-gray-700');
            activeBtn.classList.add('bg-red-900', 'bg-opacity-40', 'text-red-400', 'border-red-500');
        }

        const contentArea = document.getElementById('ceo-content-area');
        const s = app.state.stocks[this.currentCompanyIdx];
        if (!s) return;

        // [核心新增] 判斷當前是否為「唯讀監控模式」(玩家是董事長但不是 CEO)
        const isReadOnly = !s.playerRole || !s.playerRole.includes('CEO');
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        // 唯讀模式專屬頂部橫幅 (附帶一鍵親自接任按鈕)
        const readOnlyBanner = isReadOnly ? `
            <div class="bg-yellow-900 bg-opacity-30 border border-yellow-600 p-3 mb-4 flex justify-between items-center shadow-[0_0_10px_rgba(255,255,0,0.1)]">
                <div>
                    <div class="text-yellow font-bold text-sm">👁️ 董事長唯讀監控模式</div>
                    <div class="text-[10px] text-gray-300 mt-0.5">本公司目前由外部執行長自主營運中。您可檢視各項機密進度與團隊編制，但無法手動操控決策。</div>
                </div>
                <button class="btn-retro px-3 py-1 text-xs border-red-500 text-red-500 hover:bg-red-900 hover:text-white transition font-bold animate-pulse whitespace-nowrap" onclick="app.takeOverCEO(${this.currentCompanyIdx})">
                    親自接任 CEO
                </button>
            </div>
        ` : '';

        if (tabId === 'main') {
            const currentPct = s.totalShares ? ((s.owned / s.totalShares) * 100) : 0;

            // --- 未上市狀態的 IPO 申請面板 ---
            if (s.isListed === false) {
                const diffTime = Math.abs(app.state.date - (s.foundDate || app.state.date));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const monthWait = 180;
                const timeReady = diffDays >= monthWait;
                const profitReady = s.corporateCash > (s.initialCapital || 0);

                contentArea.innerHTML = readOnlyBanner + `
                    <div class="bg-black border-2 border-red-500 p-6">
                        <h3 class="text-xl text-red-500 font-bold mb-4 border-b border-red-900 pb-2">🚀 申請掛牌上市 (IPO Application)</h3>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center bg-gray-900 p-3">
                                <span>1. 成立時間已滿半年 (${diffDays}/${monthWait}天)</span>
                                <span class="${timeReady ? 'text-green-400' : 'text-red-500'} font-bold">${timeReady ? '● 通過' : '○ 未達'}</span>
                            </div>
                            <div class="flex justify-between items-center bg-gray-900 p-3">
                                <span>2. 主管機關獲利審核 (目前資產: $${app.formatMoney(s.corporateCash)})</span>
                                <span class="${profitReady ? 'text-green-400' : 'text-red-500'} font-bold">${profitReady ? '● 獲利中' : '○ 虧損中'}</span>
                            </div>
                            
                            <div class="mt-6 p-4 border border-gray-700">
                                <label class="text-xs text-gray-400 block mb-2">請選擇預計釋出之股權比例 (20% ~ 55%):</label>
                                <input type="range" id="ipo-pct-range" min="20" max="55" value="30" class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500" oninput="document.getElementById('ipo-pct-val').innerText = this.value + '%'" ${disabledAttr}>
                                <div class="text-center text-2xl font-bold text-yellow mt-2" id="ipo-pct-val">30%</div>
                                <div class="text-[10px] text-gray-500 mt-2">※ 釋出比例越高，IPO 籌得資金越多，但您的控制權會隨之稀釋。</div>
                            </div>
                            
                            <div class="p-4 border border-yellow-800 bg-yellow-900 bg-opacity-20 mb-4 mt-4">
                                <label class="text-xs text-yellow block mb-2">💰 私有化增資 (注入個人現金至公司帳戶以供研發):</label>
                                <div class="flex gap-2">
                                    <input type="number" id="private-inject-amount" class="bg-black border border-yellow-600 w-full p-2 text-white outline-none font-bold" placeholder="輸入金額" value="10000000" min="0" step="1000000" ${disabledAttr}>
                                    <button class="btn-retro px-4 py-2 border-yellow-600 text-yellow-600 hover:bg-yellow-900 hover:text-white transition whitespace-nowrap ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.injectPrivateCapitalCustom()">確認注資</button>
                                </div>
                                <div class="text-[10px] text-gray-400 mt-2">※ 當公司現金不足以支付研發時可由此補足。</div>
                            </div>

                            <button class="btn-retro w-full py-4 text-lg font-bold ${(timeReady && profitReady && !isReadOnly) ? 'border-red-500 text-red-400 hover:bg-red-900' : 'border-gray-800 text-gray-700 cursor-not-allowed'}" 
                                ${(timeReady && profitReady && !isReadOnly) ? '' : 'disabled'} onclick="CEO_MODULE.performIPO()">
                                ${isReadOnly ? '唯讀模式無法提交 IPO 申請' : '提交 IPO 申請並進行詢價圈購'}
                            </button>
                        </div>
                    </div>
                `;
                return;
            }

            // [修正] 只保留單一組定義文字宣告
            const rangeLabels = { 'month': '本月營運', '6m': '近半年 (6M)', '12m': '近一年 (12M)', 'lastYear': '前一年度全年度' };
            const activeClass = "bg-cyan-900 text-white border-cyan-500";
            const inactiveClass = "text-gray-500 border-gray-800 hover:text-cyan-400";



            // 呼叫計算函式取得指定區間的財務數據 (fData)
            const fData = this.calcFinanceData(s, this.financeViewRange);
            const profitColor = fData.profit >= 0 ? 'text-green-400' : 'text-red-500';

            let crisisBannerHtml = '';
            if (s.pendingCrisis) {
                const c = s.pendingCrisis;
                const canAffordSettlement = s.corporateCash >= c.settlementCost;
                crisisBannerHtml = `
                    <div class="bg-black border-2 border-red-500 p-4 mb-4 shadow-[0_0_15px_rgba(255,0,0,0.3)] animate-pulse">
                        <div class="flex items-center gap-2 border-b border-red-900 pb-2 mb-2">
                            <span class="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">緊急裁示</span>
                            <h3 class="text-base text-red-500 font-bold">${c.name}</h3>
                        </div>
                        <p class="text-xs text-gray-300 mb-3">${c.desc}</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            <div class="bg-gray-900 p-2.5 border border-gray-800 flex flex-col justify-between">
                                <div>
                                    <div class="text-xs font-bold text-yellow mb-1">方案 A：天價和解金 (立即私了)</div>
                                    <div class="text-[10px] text-gray-400">當局撤案並達成庭外和解，一次性認列鉅額損失，保全產品日常銷售動能。</div>
                                </div>
                                <button class="btn-retro w-full mt-3 py-1.5 text-xs font-bold ${canAffordSettlement ? 'border-yellow text-yellow hover:bg-yellow-900 hover:text-white' : 'border-gray-700 text-gray-600 cursor-not-allowed'}"
                                    ${canAffordSettlement ? '' : 'disabled'} onclick="CEO_MODULE.resolveCrisis('${s.id}', 'settle')">
                                    ${canAffordSettlement ? `支付和解金 $${app.formatMoney(c.settlementCost)}` : `帳上現金不足以支付和解金`}
                                </button>
                            </div>
                            <div class="bg-gray-900 p-2.5 border border-gray-800 flex flex-col justify-between">
                                <div>
                                    <div class="text-xs font-bold text-cyan mb-1">方案 B：曠日廢時打官司 (進入纏訟)</div>
                                    <div class="text-[10px] text-gray-400">堅持無罪抗辯。預計纏訟 <span class="text-white font-bold">${c.duration} 個月</span>，期間<span class="text-red-400 font-bold">全線產品收益直接減半</span>，且每月需支付法務費 $${app.formatMoney(c.monthlyCost)}。</div>
                                </div>
                                <button class="btn-retro w-full mt-3 py-1.5 text-xs font-bold border-cyan text-cyan hover:bg-cyan-900 hover:text-white"
                                    onclick="CEO_MODULE.resolveCrisis('${s.id}', 'court')">
                                    選擇進入纏訟階段
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else if (s.activeLawsuit) {
                crisisBannerHtml = `
                    <div class="bg-gray-900 bg-opacity-60 border border-magenta p-3 mb-4 flex justify-between items-center text-xs">
                        <div>
                            <span class="text-magenta font-bold">⚖️ 訴訟纏訟中：${s.activeLawsuit.name}</span>
                            <div class="text-[10px] text-gray-400 mt-0.5">當前全線產品每日營收受阻減半 (x0.5) | 每月定額法務扣款 $${app.formatMoney(s.activeLawsuit.monthlyCost)}</div>
                        </div>
                        <span class="text-yellow font-bold shrink-0">距離結案剩餘：${s.activeLawsuit.monthsLeft} 個月</span>
                    </div>
                `;
            }

            contentArea.innerHTML = readOnlyBanner + `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div class="space-y-4">
                        <!-- 企業損益表 -->
                        <div class="bg-black border border-cyan-900 p-4 shadow-[inset_0_0_10px_rgba(0,255,255,0.05)]">
                            <div class="flex justify-between items-center mb-3 border-b border-cyan-900 pb-1">
                                <h3 class="text-cyan font-bold flex items-center gap-2">💰 企業損益表 (P&L Statement)</h3>
                                <div class="flex gap-1">
                                    ${['month', '6m', '12m', 'lastYear'].map(r => `
                                        <button class="text-[9px] px-1.5 py-0.5 border transition-all ${this.financeViewRange === r ? activeClass : inactiveClass}" 
                                            onclick="CEO_MODULE.changeFinanceRange('${r}')">${r === 'month' ? '本月' : (r === '6m' ? '半年' : (r === '12m' ? '一年' : '去年'))}</button>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="text-[10px] text-yellow mb-3">當前檢視區間：<span class="font-bold">${rangeLabels[this.financeViewRange]}</span></div>

                            <div class="space-y-2 text-xs">
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-400">區間累計總收入:</span>
                                    <span class="text-green-400 font-bold">+$${app.formatMoney(fData.rev)}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-400">區間累計總支出:</span>
                                    <span class="text-red-400">-$${app.formatMoney(fData.exp)}</span>
                                </div>
                                <div class="flex justify-between items-center text-yellow">
                                    <span class="opacity-70">↳ 預計/已繳所得稅:</span>
                                    <span class="font-bold">-$${app.formatMoney(fData.tax)}</span>
                                </div>
                                <div class="flex justify-between items-center pt-2 border-t border-gray-800 mt-1">
                                    <span class="text-white font-bold">稅後淨利 (Net Income):</span>
                                    <span class="${profitColor} font-black text-sm">${fData.profit >= 0 ? '+' : ''}$${app.formatMoney(fData.profit)}</span>
                                </div>
                            </div>
                        </div>

                        <!-- 財報與市場預期 -->
                        <div class="bg-black border border-gray-700 p-4">
                            <h3 class="text-yellow font-bold mb-3 border-b border-gray-700 pb-1 flex justify-between items-center">
                                <span>📊 財報與市場預期</span>
                                <span class="text-xs font-normal text-gray-400">年度宏觀風向</span>
                            </h3>
                            
                            <div class="mb-3 pb-2 border-b border-gray-800 flex justify-between items-center text-xs">
                                <span class="text-gray-400">所屬板塊景氣狀態:</span>
                                ${(() => {
                                    const cMult = this.getSectorProfitMultiplier(s.sector);
                                    if (cMult === 1.2) return '<span class="text-yellow font-bold bg-yellow-900 bg-opacity-40 px-2 py-0.5 rounded border border-yellow-600 animate-pulse">🔥 主導風口 (獲利 x1.2)</span>';
                                    if (cMult === 1.1) return '<span class="text-green-400 font-bold bg-green-900 bg-opacity-40 px-2 py-0.5 rounded border border-green-600">✨ 外溢受惠 (獲利 x1.1)</span>';
                                    return '<span class="text-cyan font-bold bg-cyan-900 bg-opacity-40 px-2 py-0.5 rounded border border-cyan-800">❄️ 景氣冷卻 (獲利 x0.8)</span>';
                                })()}
                            </div>

                            <div class="space-y-2 text-xs">
                                <div class="flex justify-between"><span>當前股價:</span> <span class="text-white">$${app.formatMoney(s.price)}</span></div>
                                <div class="flex justify-between"><span>市場熱度 (Hype):</span> <span class="text-magenta">${(s.spillover * 100).toFixed(1)} / 100</span></div>
                                <div class="flex justify-between"><span>區間每股盈餘 (EPS):</span> <span class="text-cyan">$${(fData.profit / s.totalShares).toFixed(2)}</span></div>
                            </div>
                        </div>

                        <!-- 產品與現金流明細入口 -->
                        <div class="bg-black border border-gray-700 p-4 pt-3">
                            <div class="flex justify-between items-center bg-gray-900 bg-opacity-50 p-2.5 border border-gray-800">
                                <div>
                                    <div class="text-xs text-yellow font-bold">💸 產品營收與日常現金流</div>
                                    <div class="text-[10px] text-gray-400 mt-0.5">查看產品銷售進帳與各級營運成本之日結流量明細。</div>
                                </div>
                                <button class="btn-retro px-3 py-1 text-xs border-green-500 text-green-400 hover:bg-green-900 hover:text-white transition font-bold" onclick="CEO_MODULE.switchTab('flow')">
                                    查看明細
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 董事會與經營權決策 -->
                    <div class="bg-black border border-yellow-800 p-4 relative">
                        <h3 class="text-yellow-500 font-bold mb-2 border-b border-yellow-800 pb-1">🏛️ 董事會與經營權決策</h3>
                        <div class="space-y-2 text-xs">
                            <div class="flex justify-between"><span>個人持股比例:</span> <span class="text-white font-bold">${currentPct.toFixed(4)}%</span></div>
                            <div class="flex justify-between"><span>目前職位:</span> <span class="text-cyan font-bold">${s.playerRole || '散戶'}</span></div>
                            
                            <div class="mt-4 border-t border-yellow-900 pt-3 space-y-2">
                                <button class="btn-retro w-full py-2 text-xs border-yellow text-yellow hover:bg-yellow-900 transition" onclick="app.proxyFight()">
                                    發動委託書大戰 (奪取/鞏固經營權)
                                </button>
                                <button class="btn-retro w-full py-2 text-xs border-cyan text-cyan hover:bg-cyan-900 transition" onclick="app.tenderOffer(0.1)">
                                    公開收購 10% 股份 (溢價20%)
                                </button>
                            </div>
                            <div class="text-[10px] text-gray-500 mt-2 text-center">進行決策將消耗個人帳戶現金，請謹慎操作。</div>
                        </div>
                    </div>
                </div>
            `;
        } else if (tabId === 'hr') {
            if (s.workerCount === undefined || isNaN(s.workerCount)) {
                s.workerCount = 200;
            }
            const baseSalaryPerWorker = 45000;
            const hireCostPerWorker = 10000;
            const fireCostPerWorker = 45000;

            const diff = s.workerCount - 200;
            const rdMod = Math.floor(diff / 50);
            const opsMod = Math.floor(diff / 100);
            const statusColor = diff >= 0 ? 'text-green-400 font-bold' : 'text-red-500 font-bold animate-pulse';
            const statusLabel = diff >= 0 ? '規模效益' : '⚠️ 編制不足懲罰';

            const hasControl = (s.owned / (s.totalShares || 1)) >= 0.5 || (s.playerRole && (s.playerRole.includes('董事長') || s.playerRole.includes('創辦人') || s.playerRole.includes('CEO')));
            const controlDisabledAttr = hasControl ? '' : 'disabled';
            const controlDisabledClass = hasControl ? '' : 'opacity-50 cursor-not-allowed';

            let ceoHtml = '';
            if (s.currentCEO) {
                const c = s.currentCEO;
                const isPlayer = c.id === 'PLAYER_CEO';
                let traitsHtml = '';
                if (c.traits && c.traits.length > 0) {
                    c.traits.forEach(tk => {
                        const t = CEO_CONFIG.traits[tk];
                        if (t) {
                            traitsHtml += `
                                <div class="border ${t.isBad ? 'border-red-900 bg-red-950 bg-opacity-40 text-red-400' : 'border-yellow-800 bg-yellow-950 bg-opacity-40 text-yellow'} px-2 py-1 text-[10px] rounded flex flex-col gap-0.5">
                                    <span class="font-bold">【${t.name}】</span>
                                    <span class="text-gray-400 text-[9px]">${t.desc}</span>
                                </div>
                            `;
                        }
                    });
                } else {
                    traitsHtml = `<span class="text-gray-500 italic text-[10px]">無特殊性格特質</span>`;
                }

                if (isPlayer) {
                    ceoHtml = `
                    <div class="bg-black border-2 border-yellow-500 p-5 shadow-[0_0_20px_rgba(234,179,8,0.2)] relative">
                        <div class="absolute top-4 right-4 bg-yellow-950 text-yellow border border-yellow-600 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                            👑 您親自掌舵
                        </div>
                        <h4 class="text-yellow-500 font-bold text-lg flex items-center gap-2 mb-3">👑 執行長 (CEO) : ${c.name}</h4>
                        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs mb-4 text-center">
                            <div class="bg-yellow-950 bg-opacity-30 border border-yellow-900 p-2"><div class="text-gray-400 text-[10px]">領導力</div><div class="text-lg text-yellow font-black">${c.stats.leadership}</div></div>
                            <div class="bg-yellow-950 bg-opacity-30 border border-yellow-900 p-2"><div class="text-gray-400 text-[10px]">研發力</div><div class="text-lg text-yellow font-black">${c.stats.rd}</div></div>
                            <div class="bg-yellow-950 bg-opacity-30 border border-yellow-900 p-2"><div class="text-gray-400 text-[10px]">財務力</div><div class="text-lg text-yellow font-black">${c.stats.finance}</div></div>
                            <div class="bg-yellow-950 bg-opacity-30 border border-yellow-900 p-2"><div class="text-gray-400 text-[10px]">行銷力</div><div class="text-lg text-yellow font-black">${c.stats.marketing}</div></div>
                            <div class="bg-yellow-950 bg-opacity-30 border border-yellow-900 p-2"><div class="text-gray-400 text-[10px]">營運力</div><div class="text-lg text-yellow font-black">${c.stats.operations}</div></div>
                        </div>
                        <div class="flex justify-between items-center text-xs border-t border-yellow-900 border-opacity-30 pt-3">
                            <span class="text-yellow">薪酬方案: 兼任不支領固定月薪 ($0/月)</span>
                            <button class="btn-retro px-3 py-1 text-xs border-red-500 text-red-500 hover:bg-red-900 hover:text-white transition font-bold ${controlDisabledClass}" ${controlDisabledAttr} onclick="CEO_MODULE.fireCEO()">
                                卸任兼任職務
                            </button>
                        </div>
                    </div>
                    `;
                } else {
                    ceoHtml = `
                    <div class="bg-black border border-cyan-900 p-5 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative">
                        <div class="absolute top-4 right-4 bg-cyan-950 text-cyan border border-cyan-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            💼 外部聘任執行長
                        </div>
                        <h4 class="text-cyan font-bold text-lg mb-3">👨‍💼 執行長 (CEO) : ${c.name} <span class="text-xs text-gray-400 font-normal">(${c.age}歲)</span></h4>
                        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs mb-4 text-center">
                            <div class="bg-cyan-950 bg-opacity-20 border border-cyan-900 p-2"><div class="text-gray-400 text-[10px]">領導力</div><div class="text-lg text-cyan font-black">${c.stats.leadership}</div></div>
                            <div class="bg-cyan-950 bg-opacity-20 border border-cyan-900 p-2"><div class="text-gray-400 text-[10px]">研發力</div><div class="text-lg text-cyan font-black">${c.stats.rd}</div></div>
                            <div class="bg-cyan-950 bg-opacity-20 border border-cyan-900 p-2"><div class="text-gray-400 text-[10px]">財務力</div><div class="text-lg text-cyan font-black">${c.stats.finance}</div></div>
                            <div class="bg-cyan-950 bg-opacity-20 border border-cyan-900 p-2"><div class="text-gray-400 text-[10px]">行銷力</div><div class="text-lg text-cyan font-black">${c.stats.marketing}</div></div>
                            <div class="bg-cyan-950 bg-opacity-20 border border-cyan-900 p-2"><div class="text-gray-400 text-[10px]">營運力</div><div class="text-lg text-cyan font-black">${c.stats.operations}</div></div>
                        </div>
                        <div class="mb-4">
                            <div class="text-xs text-gray-400 mb-1.5 font-bold">個性與業務特質:</div>
                            <div class="flex flex-wrap gap-2">${traitsHtml}</div>
                        </div>
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-cyan-900 border-opacity-30 pt-3 text-xs">
                            <span class="text-cyan">年薪契約方案: $${app.formatMoney(c.salary)} / 年</span>
                            <div class="flex gap-2 w-full sm:w-auto">
                                <button class="btn-retro px-3 py-1 flex-1 sm:flex-none border-yellow-600 text-yellow-600 hover:bg-yellow-900 hover:text-white transition font-bold ${controlDisabledClass}" ${controlDisabledAttr} onclick="app.takeOverCEO(${this.currentCompanyIdx}); CEO_MODULE.switchTab('hr');">
                                    親自兼任
                                </button>
                                <button class="btn-retro px-3 py-1 flex-1 sm:flex-none border-red-500 text-red-500 hover:bg-red-900 hover:text-white transition font-bold ${controlDisabledClass}" ${controlDisabledAttr} onclick="CEO_MODULE.fireCEO()">
                                    解雇
                                </button>
                            </div>
                        </div>
                    </div>
                    `;
                }
            } else {
                let candidatesHtml = '';
                const pMult = app.state.priceMultiplier || 1.0;
                const costCeoHeadhunter = Math.floor(10000000 * pMult);

                if (s.ceoCandidates && s.ceoCandidates.length > 0) {
                    s.ceoCandidates.forEach(t => {
                        let traitsListHtml = '';
                        if (t.traits && t.traits.length > 0) {
                            t.traits.forEach(tk => {
                                const trait = CEO_CONFIG.traits[tk];
                                if (trait) {
                                    traitsListHtml += `
                                        <div class="border ${trait.isBad ? 'border-red-900 bg-red-950 bg-opacity-40 text-red-400' : 'border-yellow-800 bg-yellow-950 bg-opacity-40 text-yellow'} px-2 py-0.5 text-[9px] rounded">
                                            【${trait.name}】 ${trait.desc}
                                        </div>
                                    `;
                                }
                            });
                        } else {
                            traitsListHtml = '<span class="text-gray-500 italic text-[9px]">無特殊性格特質</span>';
                        }

                        candidatesHtml += `
                            <div class="bg-black border border-gray-700 p-3 mt-3 shadow-[0_0_15px_rgba(0,255,255,0.05)]">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <span class="font-bold text-white text-sm">${t.name}</span>
                                        <span class="text-[10px] text-gray-400 ml-2">經理人</span>
                                    </div>
                                    <div class="text-base font-bold text-cyan flex gap-3 text-center">
                                        <div><div class="text-[8px] text-gray-500 font-normal">領導</div><div>${t.stats.leadership}</div></div>
                                        <div><div class="text-[8px] text-gray-500 font-normal">研發</div><div>${t.stats.rd}</div></div>
                                        <div><div class="text-[8px] text-gray-500 font-normal">財務</div><div>${t.stats.finance}</div></div>
                                        <div><div class="text-[8px] text-gray-500 font-normal">行銷</div><div>${t.stats.marketing}</div></div>
                                        <div><div class="text-[8px] text-gray-500 font-normal">營運</div><div>${t.stats.operations}</div></div>
                                    </div>
                                </div>
                                <div class="space-y-1 mb-3">${traitsListHtml}</div>
                                <div class="mt-2 border-t border-gray-800 pt-2 flex justify-between items-center">
                                    <span class="text-cyan text-xs">要求薪酬: $${app.formatMoney(t.salary)} / 年</span>
                                    <button class="btn-retro px-4 py-1 text-xs border-green-500 text-green-500 hover:bg-green-900 hover:text-white transition font-bold ${controlDisabledClass}" ${controlDisabledAttr} onclick="CEO_MODULE.hireCEO('${t.id}')">
                                        批准委任 CEO
                                    </button>
                                </div>
                            </div>`;
                    });
                    candidatesHtml += `<button class="btn-retro w-full mt-3 py-1.5 text-xs text-gray-500 border-gray-800 hover:text-white transition" onclick="CEO_MODULE.cancelCEOHeadhunter('${s.id}')">取消委託 / 隱藏 CEO 候選人名單</button>`;
                }

                ceoHtml = `
                <div class="bg-black border border-red-900 p-5 shadow-[0_0_15px_rgba(239,68,68,0.1)] relative">
                    <div class="absolute top-4 right-4 bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                        ⚠️ 執行長空缺中
                    </div>
                    <h4 class="text-red-500 font-bold text-lg mb-3">🏢 執行長 (CEO) 決策權空缺中</h4>
                    <p class="text-xs text-gray-400 mb-4">目前公司無執行長，研發與新聞日常營運將處於停滯冷卻狀態！大股東需立即指派或招聘執行長掌舵。</p>
                    
                    ${s.ceoCandidates && s.ceoCandidates.length > 0 ? `
                        <div class="border-t border-gray-800 pt-3">
                            <div class="text-xs text-cyan font-bold mb-2">🎯 頂級獵頭推薦 CEO 候選人名單：</div>
                            ${candidatesHtml}
                        </div>
                    ` : `
                        <div class="flex flex-col sm:flex-row gap-3">
                            <button class="btn-retro flex-1 py-3 border-yellow-600 text-yellow-600 hover:bg-yellow-900 hover:text-white transition font-bold text-xs ${controlDisabledClass}" ${controlDisabledAttr} onclick="app.takeOverCEO(${this.currentCompanyIdx}); CEO_MODULE.switchTab('hr');">
                                👑 親自兼任 CEO
                            </button>
                            <button class="btn-retro flex-1 py-3 border-cyan text-cyan hover:bg-cyan-900 hover:text-white transition font-bold text-xs ${controlDisabledClass}" ${controlDisabledAttr} onclick="CEO_MODULE.triggerCEOHeadhunter('${s.id}', ${costCeoHeadhunter})">
                                🤝 委託頂級獵頭尋找 CEO (-$${app.formatMoney(costCeoHeadhunter)})
                            </button>
                        </div>
                    `}
                </div>
                `;
            }

            const workforceHtml = `
                <div class="bg-black border border-cyan-900 p-4 mb-6 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                    <h3 class="text-white font-bold mb-3 flex justify-between items-center">
                        <span>👥 基層勞動力 management (WORKFORCE)</span>
                        <span class="text-cyan text-sm">${app.formatMoney(s.workerCount)} 名員工</span>
                    </h3>
                    <div class="grid grid-cols-2 gap-4 mb-3 text-[10px]">
                        <div class="text-gray-400">月度薪資支出：<span class="text-red-400">-$${app.formatMoney(s.workerCount * baseSalaryPerWorker)}</span></div>
                        <div class="text-gray-400 text-right">${statusLabel}：<span class="${statusColor}">研發力 ${rdMod >= 0 ? '+' : ''}${rdMod} | 營運力 ${opsMod >= 0 ? '+' : ''}${opsMod}</span></div>
                    </div>
                    
                    <div class="space-y-2 pt-2 border-t border-cyan-900 border-opacity-50">
                        <div class="flex items-center gap-1.5 text-xs">
                            <span class="text-green-500 font-bold w-14 shrink-0">➕ 擴編:</span>
                            <button class="btn-retro flex-1 py-1.5 border-green-600 text-green-500 hover:bg-green-900 text-xs font-bold ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.manageWorkforce('${s.id}', 10, ${hireCostPerWorker})">
                                +10 人
                            </button>
                            <button class="btn-retro flex-1 py-1.5 border-green-600 text-green-500 hover:bg-green-900 text-xs font-bold ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.manageWorkforce('${s.id}', 50, ${hireCostPerWorker})">
                                +50 人
                            </button>
                            <button class="btn-retro flex-1 py-1.5 border-green-600 text-green-500 hover:bg-green-900 text-xs font-bold ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.manageWorkforce('${s.id}', 100, ${hireCostPerWorker})">
                                +100 人
                            </button>
                        </div>
                        
                        <div class="flex items-center gap-1.5 text-xs">
                            <span class="text-red-500 font-bold w-14 shrink-0">➖ 裁撤:</span>
                            <button class="btn-retro flex-1 py-1.5 border-red-700 text-red-500 hover:bg-red-900 text-xs font-bold ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.manageWorkforce('${s.id}', -10, ${fireCostPerWorker})">
                                -10 人
                            </button>
                            <button class="btn-retro flex-1 py-1.5 border-red-700 text-red-500 hover:bg-red-900 text-xs font-bold ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.manageWorkforce('${s.id}', -50, ${fireCostPerWorker})">
                                -50 人
                            </button>
                            <button class="btn-retro flex-1 py-1.5 border-red-700 text-red-500 hover:bg-red-900 text-xs font-bold ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.manageWorkforce('${s.id}', -100, ${fireCostPerWorker})">
                                -100 人
                            </button>
                        </div>
                        
                        <div class="flex justify-between items-center text-[10px] text-gray-500 mt-1">
                            <span>※ 基準維持門檻：200 人</span>
                            <span>規費: 招募 $${app.formatMoney(hireCostPerWorker)}/人 | 資遣 $${app.formatMoney(fireCostPerWorker)}/人</span>
                        </div>
                    </div>
                </div>
            `;

            let teamHtml = '';
            if (!s.executiveCandidates) s.executiveCandidates = { cto: [], cmo: [], cfo: [] };

            const pMult = app.state.priceMultiplier || 1.0;
            const costHeadhunter = Math.floor(1000000 * pMult);

            ['cto', 'cmo', 'cfo'].forEach(role => {
                let emp = s.employees[role];
                let candidates = s.executiveCandidates[role] || [];
                let roleName = role === 'cto' ? '技術長 (CTO)' : (role === 'cmo' ? '行銷長 (CMO)' : '財務長 (CFO)');

                let roleContent = '';
                if (emp) {
                    let bonusLabel = role === 'cto' ? '研發力' : (role === 'cmo' ? '行銷力' : '財務力');
                    let traitDef = CEO_CONFIG.traits[emp.trait];
                    const currentBonus = emp.bonus !== undefined ? emp.bonus : Math.floor((emp.skill || 0) / 8);

                    roleContent = `
                        <div class="bg-black border border-green-800 p-3 flex justify-between items-center">
                            <div>
                                <div class="text-green-400 font-bold">${roleName} : ${emp.name}</div>
                                <div class="text-[10px] text-gray-400 mt-1">
                                    能力評分: <span class="text-white">${emp.skill}</span> | 
                                    <span class="text-green-400 font-bold">${bonusLabel} +${currentBonus}</span>
                                </div>
                                <div class="text-[10px] text-gray-400 mt-1">
                                    <span class="text-yellow">[${traitDef ? traitDef.name : '無'}]</span> ${traitDef ? traitDef.desc : ''}
                                </div>
                                <div class="text-[10px] text-cyan mt-1">
                                    薪酬方案: 現金 $${app.formatMoney(emp.salary)} / 月
                                </div>
                            </div>
                            <button class="btn-retro px-2 py-1 text-xs border-red-500 text-red-500 hover:bg-red-900 ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.fireExecutive('${role}')">解雇</button>
                        </div>`;
                } else {
                    let candidatesHtml = '';
                    if (candidates.length > 0) {
                        candidates.forEach(t => {
                            let traitDef = CEO_CONFIG.traits[t.trait];
                            candidatesHtml += `
                                <div class="bg-black border border-gray-700 p-2.5 mt-2 shadow-[0_0_10px_rgba(0,255,255,0.05)]">
                                    <div class="flex justify-between items-start mb-1.5">
                                        <div>
                                            <span class="font-bold text-white text-xs">${t.name}</span>
                                            <span class="text-[10px] text-yellow ml-1">[${traitDef ? traitDef.name : '無'}]</span>
                                            <div class="text-[10px] text-gray-400 mt-0.5">${traitDef ? traitDef.desc : ''}</div>
                                        </div>
                                        <div class="text-lg font-bold text-cyan">${t.skill}</div>
                                    </div>
                                    <div class="mt-2 border-t border-gray-800 pt-2">
                                        <button class="btn-retro w-full py-1 text-[10px] border-green-500 text-green-500 hover:bg-green-900 hover:text-white transition font-bold ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.hireExecutive('${role}', '${t.id}', 'cash')">
                                            以純現金聘用 ($${app.formatMoney(t.salary)}/月)
                                        </button>
                                    </div>
                                </div>`;
                        });
                        candidatesHtml += `<button class="btn-retro w-full mt-2 py-1 text-[10px] text-gray-500 border-gray-800 hover:text-white transition" onclick="CEO_MODULE.cancelExecutiveHeadhunter('${s.id}', '${role}')">取消委託 / 隱藏候選人名單</button>`;
                    }

                    roleContent = `
                        <div class="bg-gray-900 bg-opacity-20 border border-gray-800 p-3 text-center border-dashed">
                            <div class="text-gray-500 text-xs mb-2">${roleName} 職位空缺中</div>
                            ${candidates.length === 0 ? `
                                <button class="btn-retro px-4 py-2 text-xs border-cyan text-cyan hover:bg-cyan-900 hover:text-white transition font-bold w-full ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.triggerExecutiveHeadhunter('${s.id}', '${role}', ${costHeadhunter})">
                                    🤝 委託獵頭精選尋找 ${roleName} (-$${app.formatMoney(costHeadhunter)})
                                </button>
                            ` : `<div class="text-left border-t border-gray-800 pt-2 mt-2"><div class="text-[11px] text-cyan font-bold mb-1">精選 ${roleName} 推薦名單：</div>${candidatesHtml}</div>`}
                        </div>`;
                }
                teamHtml += `<div class="mb-4">${roleContent}</div>`;
            });

            contentArea.innerHTML = readOnlyBanner + ceoHtml + `<div class="my-6"></div>` + workforceHtml + `
                <div>
                    <h3 class="text-cyan font-bold mb-3 border-b border-cyan-900 pb-1 tracking-widest text-sm">👨‍💼 高階經理人定向獵頭委託 (EXECUTIVE SEARCH)</h3>
                    <div class="space-y-2">${teamHtml}</div>
                    <div class="mt-4 p-3 bg-black border border-gray-800 text-[10px] text-gray-500 leading-relaxed">
                        <span class="text-yellow font-bold">💡 董事長提示：</span>針對特定 high-level 職位發動定向獵頭委託，每次將為該職缺專門尋找 3 位專業能力卓越的候選人。一旦正式聘用，該職缺其餘推薦名單將自動結案。
                    </div>
                </div>
            `;
        } else if (tabId === 'ops') {
            const sector = s.sector;
            let rendered = false;

            // 根據不同產業調用專屬的核心營運渲染函數
            if (sector === 'semi' && typeof CEO_SEMI !== 'undefined' && typeof CEO_SEMI.renderSemiTab === 'function') {
                CEO_SEMI.renderSemiTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'electronics' && typeof CEO_ELECTRONICS !== 'undefined' && typeof CEO_ELECTRONICS.renderElectronicsTab === 'function') {
                CEO_ELECTRONICS.renderElectronicsTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'software_ai' && typeof CEO_SOFTWARE !== 'undefined' && typeof CEO_SOFTWARE.renderSoftwareTab === 'function') {
                CEO_SOFTWARE.renderSoftwareTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'game' && typeof CEO_GAME !== 'undefined' && typeof CEO_GAME.renderGameTab === 'function') {
                CEO_GAME.renderGameTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'telecom' && typeof CEO_TELECOM !== 'undefined' && typeof CEO_TELECOM.renderTelecomTab === 'function') {
                CEO_TELECOM.renderTelecomTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'auto' && typeof CEO_AUTO !== 'undefined' && typeof CEO_AUTO.renderAutoTab === 'function') {
                CEO_AUTO.renderAutoTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'finance' && typeof CEO_FINANCE !== 'undefined' && typeof CEO_FINANCE.renderFinanceTab === 'function') {
                CEO_FINANCE.renderFinanceTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'realestate' && typeof CEO_REALESTATE !== 'undefined' && typeof CEO_REALESTATE.renderRealestateTab === 'function') {
                CEO_REALESTATE.renderRealestateTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'retail' && typeof CEO_RETAIL !== 'undefined' && typeof CEO_RETAIL.renderRetailTab === 'function') {
                CEO_RETAIL.renderRetailTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'food' && typeof CEO_FOOD !== 'undefined' && typeof CEO_FOOD.renderFoodTab === 'function') {
                CEO_FOOD.renderFoodTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'pharma' && typeof CEO_PHARMA !== 'undefined' && typeof CEO_PHARMA.renderPharmaTab === 'function') {
                CEO_PHARMA.renderPharmaTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'transport' && typeof CEO_TRANSPORT !== 'undefined' && typeof CEO_TRANSPORT.renderTransportTab === 'function') {
                CEO_TRANSPORT.renderTransportTab(s, contentArea, isReadOnly);
                rendered = true;
            } else if (sector === 'energy' && typeof CEO_ENERGY !== 'undefined' && typeof CEO_ENERGY.renderEnergyTab === 'function') {
                CEO_ENERGY.renderEnergyTab(s, contentArea, isReadOnly);
                rendered = true;
            }

            // 安全降級：若對應產業的渲染函數不存在，則顯示精美的通用降級提示
            if (!rendered) {
                const sectorName = (typeof DB !== 'undefined' && DB.sectors && DB.sectors[s.sector]) ? DB.sectors[s.sector].name : s.sector;
                contentArea.innerHTML = readOnlyBanner + `
                    <div class="panel p-6 border-red-500 bg-black text-center crt crt-flicker">
                        <h3 class="text-xl text-red-500 font-bold mb-4">⚠️ 核心營運模組載入中或未啟用</h3>
                        <p class="text-sm text-gray-300 mb-6">當前公司「${s.name}」所屬產業為 <span class="text-yellow font-bold">${sectorName}</span>，其專屬核心營運模組尚未就緒或不支援手動決策。</p>
                        <div class="inline-block bg-gray-900 bg-opacity-60 p-4 border border-gray-800 text-xs text-left max-w-md">
                            <span class="text-cyan font-bold">💡 開發者提示：</span>
                            <ul class="list-disc list-inside mt-2 space-y-1.5 text-gray-400">
                                <li>請確認 <span class="text-white font-mono">ceo_${s.sector}.js</span> 是否已在 HTML 中正確載入。</li>
                                <li>確認全域物件 <span class="text-white font-mono">CEO_${s.sector.toUpperCase()}</span> 的 <span class="text-white font-mono">render${s.sector.charAt(0).toUpperCase() + s.sector.slice(1)}Tab</span> 函數存在。</li>
                            </ul>
                        </div>
                    </div>
                `;
            }
        } else if (tabId === 'cap') {
            const lockOverlay = (s.isListed === false) ? `
                <div class="absolute inset-0 bg-black bg-opacity-80 z-10 flex flex-col items-center justify-center text-center p-4">
                    <div class="text-red-500 text-3xl mb-2">🔒 權限鎖定</div>
                    <div class="text-gray-400 text-sm">本公司目前為「私有化」狀態。<br>完成 IPO 掛牌後方可啟動資本市場操作。</div>
                </div>` : '';

            contentArea.innerHTML = readOnlyBanner + `
                <div class="relative grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                    ${lockOverlay} 
                    <div class="border border-blue-900 bg-blue-900 bg-opacity-10 p-4">
                        <h3 class="text-blue-400 font-bold mb-3">💰 現金增資 (SEO)</h3>
                        <p class="text-[10px] text-gray-400 mb-2">發行新股籌資。這會增加總股數並導致股價稀釋。</p>
                        <div class="space-y-3">
                            <div>
                                <label class="text-[10px] text-gray-500">計畫發行新股數 (股):</label>
                                <input type="number" id="cap-seo-shares" class="bg-black border border-blue-900 w-full p-2 text-white outline-none font-bold" placeholder="例如: 1000000" ${disabledAttr}>
                            </div>
                            <button class="btn-retro w-full py-2 border-blue-500 text-blue-400 font-bold ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.executeSEO()">執行現金增資</button>
                        </div>
                    </div>
                    
                    <div class="border border-green-900 bg-green-900 bg-opacity-10 p-4">
                        <h3 class="text-green-400 font-bold mb-3">🔄 庫藏股註銷 (Buyback)</h3>
                        <p class="text-[10px] text-gray-400 mb-2">公司買回並註銷股票。這會減少總股數並提升每股價值。</p>
                        <div class="space-y-3">
                            <div>
                                <label class="text-[10px] text-gray-500">計畫買回註銷股數 (股):</label>
                                <input type="number" id="cap-buyback-shares" class="bg-black border border-green-900 w-full p-2 text-white outline-none font-bold" placeholder="例如: 500000" ${disabledAttr}>
                            </div>
                            <button class="btn-retro w-full py-2 border-green-500 text-green-400 font-bold ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.executeBuyback()">執行庫藏股註銷</button>
                        </div>
                    </div>
                </div>
            `;
        } else if (tabId === 'flow') {
            // 1. 計算所有銷售中產品與核心營運的每日現金流入
            let productsHtml = '';
            let totalDailySales = 0;

            // 💡 核心營運大連結：將 13 大產業每日營收實時同步呈現在現金流明細中
            let hasOpsRev = (s.lastDailyRev !== undefined && s.lastDailyRev > 0);
            if (hasOpsRev) {
                totalDailySales += s.lastDailyRev;
                const sectorName = (typeof DB !== 'undefined' && DB.sectors && DB.sectors[s.sector]) ? DB.sectors[s.sector].name : s.sector;
                productsHtml += `
                    <div class="flex justify-between items-center text-xs border-b border-gray-800 py-2.5 hover:bg-gray-900 px-2 transition">
                        <div>
                            <span class="text-yellow font-bold">💼 核心營運日營收 : ${sectorName} 業務線</span>
                            <span class="text-[10px] text-gray-500 ml-2">主動日結流水 | 景氣加成: x${this.getSectorProfitMultiplier(s.sector)}</span>
                        </div>
                        <span class="text-green-400 font-mono font-bold">+$${app.formatMoney(s.lastDailyRev)} / 天</span>
                    </div>`;
            }

            if (s.launchedProducts && s.launchedProducts.length > 0) {
                // 不限制筆數，反轉呈現讓最新發布的在最上方
                [...s.launchedProducts].reverse().forEach(p => {
                    const dailyRev = p.lastRev || 0;
                    totalDailySales += dailyRev;
                    productsHtml += `
                        <div class="flex justify-between items-center text-xs border-b border-gray-800 py-2 hover:bg-gray-900 px-2 transition">
                            <div>
                                <span class="text-white font-bold">${p.name}</span>
                                <span class="text-[10px] text-gray-500 ml-2">品質: ${p.quality} | 上市 ${p.age} 天</span>
                                ${p.isBuggy ? '<span class="text-[9px] bg-red-900 text-red-300 px-1 rounded ml-1 border border-red-700">缺陷</span>' : ''}
                                ${p.isEvergreen ? '<span class="text-[9px] bg-yellow-900 text-yellow px-1 rounded ml-1 border border-yellow-700">長青</span>' : ''}
                            </div>
                            <span class="text-green-400 font-mono font-bold">+$${app.formatMoney(dailyRev)} / 天</span>
                        </div>`;
                });
            } else if (!hasOpsRev) {
                productsHtml = '<div class="text-xs text-gray-600 text-center py-6">目前架上無任何銷售中的產品。</div>';
            }

            // 2. 統計高管與基層員工的薪資支出明細
            let execSalaryHtml = '';
            let totalMonthlyExecSalary = 0;
            const roles = { cto: '技術長 (CTO)', cmo: '行銷長 (CMO)', cfo: '財務長 (CFO)' };
            Object.entries(roles).forEach(([key, title]) => {
                const emp = s.employees[key];
                if (emp && emp.payType === 'cash') {
                    totalMonthlyExecSalary += emp.salary;
                    execSalaryHtml += `
                        <div class="flex justify-between items-center text-xs border-b border-gray-800 py-1.5 px-2 text-gray-400">
                            <span>高階主管 - ${title} (${emp.name})</span>
                            <span class="text-red-400 font-mono">-$${app.formatMoney(emp.salary)} / 月</span>
                        </div>`;
                }
            });
            if (!execSalaryHtml) {
                execSalaryHtml = '<div class="text-[10px] text-gray-600 italic px-2 py-1">目前無領取純現金薪酬之高階經理人。</div>';
            }

            // 【安全修復】確保讀取時完美攔截並重置 NaN 數值
            const currentWorkers = (s.workerCount !== undefined && !isNaN(s.workerCount)) ? s.workerCount : 200;
            const baseSalaryPerWorker = 45000; // 依據遊戲內建人資標準設定
            const totalMonthlyWorkerSalary = currentWorkers * baseSalaryPerWorker;
            const totalMonthlySalary = totalMonthlyExecSalary + totalMonthlyWorkerSalary;

            // 換算成估算的每日薪資現金流出 (月薪 / 30)
            const estDailySalaryOut = Math.floor(totalMonthlySalary / 30);

            // 💡 核心營運大連結：將 13 大產業每日營運材料費與折舊日常開銷（lastDailyExp）實時同步呈現在現金流明細中
            let opsDailyExpHtml = '';
            let opsDailyExpVal = s.lastDailyExp || 0;
            if (opsDailyExpVal > 0) {
                opsDailyExpHtml = `
                    <div class="flex justify-between items-center text-xs py-1.5 px-2 text-gray-300 border-t border-gray-900 mt-1">
                        <span>🏭 核心營運日常耗損與生產成本 (日)</span>
                        <span class="text-red-400 font-mono font-bold">-$${app.formatMoney(opsDailyExpVal)} / 天</span>
                    </div>`;
            }

            const netDailyFlow = totalDailySales - estDailySalaryOut - opsDailyExpVal;
            const netFlowColor = netDailyFlow >= 0 ? 'text-green-400' : 'text-red-500';

            contentArea.innerHTML = readOnlyBanner + `
                <div class="space-y-4">
                    <div class="bg-black border border-yellow-600 p-4 shadow-[inset_0_0_10px_rgba(255,255,0,0.05)]">
                        <h3 class="text-yellow font-bold mb-3 border-b border-yellow-900 pb-1 flex justify-between items-center text-sm">
                            <span>💸 每日淨現金流量監控表 (DAILY CASH FLOW)</span>
                            <span class="text-xs text-gray-400">系統估算</span>
                        </h3>
                        <div class="grid grid-cols-2 gap-4 text-xs">
                            <div class="bg-gray-900 p-2.5 border border-gray-800">
                                <div class="text-gray-400 text-[10px] mb-1">產品銷售進帳預估 (日):</div>
                                <div class="text-green-400 font-bold font-mono text-base">+$${app.formatMoney(totalDailySales)}</div>
                            </div>
                            <div class="bg-gray-900 p-2.5 border border-gray-800">
                                <div class="text-gray-400 text-[10px] mb-1">日常總流出估算 (日):</div>
                                <div class="text-red-400 font-bold font-mono text-base">-$${app.formatMoney(estDailySalaryOut + opsDailyExpVal)}</div>
                            </div>
                        </div>
                        <div class="mt-3 pt-2 border-t border-gray-800 flex justify-between items-center">
                            <span class="text-xs text-white font-bold">每日營運淨現金流量:</span>
                            <span class="${netFlowColor} font-mono font-bold text-lg">${netDailyFlow >= 0 ? '+' : ''}$${app.formatMoney(netDailyFlow)}</span>
                        </div>
                    </div>

                    <div class="bg-black border border-green-900 p-4">
                        <h3 class="text-green-400 font-bold mb-2 border-b border-green-900 pb-1 text-xs flex justify-between">
                            <span>🛍️ 產品銷售明細清單</span>
                            <span class="text-gray-500">共銷售 ${s.launchedProducts ? s.launchedProducts.length : 0} 項</span>
                        </h3>
                        <div class="max-h-56 overflow-y-auto pr-1 space-y-1">
                            ${productsHtml}
                        </div>
                    </div>

                    <div class="bg-black border border-cyan-900 p-4">
                        <h3 class="text-cyan font-bold mb-2 border-b border-cyan-900 pb-1 text-xs flex justify-between">
                            <span>💼 企業日常營運與薪資結構明細</span>
                            <span class="text-gray-500">基本月薪: $${app.formatMoney(totalMonthlySalary)}</span>
                        </h3>
                        <div class="space-y-1 text-xs">
                            <div class="text-[10px] text-cyan font-bold pt-1 px-2">高階決策團隊</div>
                            ${execSalaryHtml}
                            <div class="text-[10px] text-cyan font-bold pt-2 border-t border-gray-900 mt-1 px-2">基層勞動力</div>
                            <div class="flex justify-between items-center text-xs py-1.5 px-2 text-gray-300">
                                <span>基層員工編制 (${app.formatMoney(currentWorkers)} 人 @ $${app.formatMoney(baseSalaryPerWorker)}/月)</span>
                                <span class="text-red-400 font-mono">-$${app.formatMoney(totalMonthlyWorkerSalary)} / 月</span>
                            </div>
                            ${opsDailyExpHtml}
                        </div>
                    </div>
                </div>
            `;
        } else if (tabId === 'invest') {
            let marketRows = '';
            app.state.stocks.filter(ts => ts.isListed !== false && ts.id !== s.id).forEach(ts => {
                let change = ts.price - (ts.lastPrice || ts.price);
                let changeStr = change >= 0 ? `<span class="text-green-400">▲ $${app.formatMoney(change)}</span>` : `<span class="text-red-500">▼ $${app.formatMoney(Math.abs(change))}</span>`;
                if (change === 0) changeStr = `<span class="text-gray-500">-</span>`;

                let totalCorpOwned = 0;
                app.state.stocks.forEach(c => {
                    if (c.corporateInvestments && c.corporateInvestments[ts.id]) {
                        totalCorpOwned += c.corporateInvestments[ts.id].owned;
                    }
                });
                let publicFloat = ts.totalShares - (ts.owned || 0) - totalCorpOwned;
                if (publicFloat < 0) publicFloat = 0;

                marketRows += `
                    <tr class="border-b border-gray-800 hover:bg-gray-900 transition">
                        <td class="py-2.5 px-2"><span class="text-white font-bold">${ts.name}</span></td>
                        <td class="py-2.5 px-2 text-right"><span class="text-cyan font-bold">$${app.formatMoney(ts.price)}</span></td>
                        <td class="py-2.5 px-2 text-right">${changeStr}</td>
                        <td class="py-2.5 px-2 text-right"><span class="text-gray-400">${app.formatMoney(publicFloat)} 股</span></td>
                        <td class="py-2.5 px-2 text-center">
                            <button class="btn-retro px-4 py-1 text-xs border-green-500 text-green-400 hover:bg-green-900 hover:text-white whitespace-nowrap ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.openCorpTradeModal('${ts.id}', 'buy')">委託買進</button>
                        </td>
                    </tr>
                `;
            });

            let portfolioRows = '';
            if (!s.corporateInvestments || Object.keys(s.corporateInvestments).filter(k => s.corporateInvestments[k].owned > 0).length === 0) {
                portfolioRows = `<tr><td colspan="7" class="text-center py-6 text-gray-500 text-xs italic bg-gray-900 bg-opacity-20 border-b border-gray-800">目前本企業帳上尚無持有其他公司股權部位。</td></tr>`;
            } else {
                Object.keys(s.corporateInvestments).forEach(k => {
                    const inv = s.corporateInvestments[k];
                    if (inv.owned <= 0) return;
                    const ts = app.state.stocks.find(x => x.id === k);
                    if (!ts) return;

                    const pct = ((inv.owned / ts.totalShares) * 100).toFixed(2);
                    const currentVal = inv.owned * ts.price;
                    const profit = currentVal - (inv.owned * inv.avgCost);
                    const profitColor = profit >= 0 ? 'text-green-400 font-bold' : 'text-red-500';

                    const buyoutPrice = ts.price * 1.2;
                    const publicFloat = ts.totalShares - ts.owned;
                    const buyoutCost = Math.floor(publicFloat * buyoutPrice);

                    portfolioRows += `
                    <tr class="border-b border-gray-800 hover:bg-gray-900 transition text-xs">
                        <td class="py-2.5 px-2"><span class="text-white font-bold">${ts.name}</span></td>
                        <td class="py-2.5 px-2 text-right text-cyan font-bold">$${app.formatMoney(ts.price)}</td>
                        <td class="py-2.5 px-2 text-right">$${app.formatMoney(inv.avgCost)}</td>
                        <td class="py-2.5 px-2 text-right font-bold text-white">${app.formatMoney(inv.owned)} 股</td>
                        <td class="py-2.5 px-2 text-right text-yellow">${pct}%</td>
                        <td class="py-2.5 px-2 text-right ${profitColor}">${profit >= 0 ? '+' : ''}$${app.formatMoney(profit)}</td>
                        <td class="py-2.5 px-2 text-center">
                            <div class="flex gap-1 justify-center">
                                <button class="btn-retro px-2 py-1 text-[10px] border-green-500 text-green-500 hover:bg-green-900 hover:text-white ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.openCorpTradeModal('${k}', 'buy')">加碼</button>
                                <button class="btn-retro px-2 py-1 text-[10px] border-yellow-600 text-yellow-600 hover:bg-yellow-900 hover:text-white ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.openCorpTradeModal('${k}', 'sell')">拋售</button>
                                ${parseFloat(pct) >= 60.0 ? `
                                    <button class="btn-retro px-2 py-1 text-[10px] border-magenta text-magenta hover:bg-magenta hover:text-white font-bold animate-pulse ${disabledClass}" ${disabledAttr} onclick="CEO_MODULE.executeMNA('${k}', ${buyoutCost})">
                                        併購 (${(buyoutCost / 100000000).toFixed(2)}億)
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                    `;
                });
            }

            contentArea.innerHTML = readOnlyBanner + `
                <div class="space-y-6">
                    <div class="bg-black border border-blue-900 p-4 shadow-[inset_0_0_10px_rgba(0,255,0,0.05)]">
                        <h3 class="text-blue-400 font-bold mb-3 border-b border-blue-800 pb-1 flex justify-between items-center text-sm">
                            <span>💼 企業投資部位庫存 (PORTFOLIO)</span>
                            <span class="text-xs text-gray-400">使用企業現鈔調度</span>
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead>
                                    <tr class="border-b border-blue-900 text-gray-500">
                                        <th class="pb-2">標的企業</th>
                                        <th class="pb-2 text-right">現價</th>
                                        <th class="pb-2 text-right">持股成本</th>
                                        <th class="pb-2 text-right">持股數</th>
                                        <th class="pb-2 text-right">持股比</th>
                                        <th class="pb-2 text-right">未實現損益</th>
                                        <th class="pb-2 text-center w-36">部位操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${portfolioRows}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="bg-black border border-gray-800 p-4">
                        <h3 class="text-white font-bold mb-3 border-b border-gray-800 pb-1 text-sm flex justify-between">
                            <span>🌎 公開市場交易板塊 (PUBLIC MARKET)</span>
                            <span class="text-xs text-gray-500">不含私有化及本企業</span>
                        </h3>
                        <div class="overflow-x-auto max-h-80 custom-scrollbar">
                            <table class="w-full text-left text-xs">
                                <thead>
                                    <tr class="border-b border-gray-800 text-gray-500">
                                        <th class="pb-2">板塊/企業</th>
                                        <th class="pb-2 text-right">現價</th>
                                        <th class="pb-2 text-right">漲跌</th>
                                        <th class="pb-2 text-right">市場流通量</th>
                                        <th class="pb-2 text-center w-24">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${marketRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="p-3 bg-black border border-gray-800 text-[10px] text-gray-500 leading-relaxed">
                        <span class="text-yellow font-bold">💡 企業轉投資指引：</span>大股東或 CEO 可操縱企業的「帳上現金」在公開二級市場進行轉投資。當持有同產業對手超過 60% 股權時，將解鎖「世紀強制併購」按鈕。點選併購後，對手將會私有化下市，其帳上現鈔、80% 營收將永久併入母公司中，玩家個人持股則獲得 20% 溢價清算退款。
                    </div>
                </div>
            `;
        }
    }, // 這是 switchTab 函數真正結束的大括號

    refreshMainDashboard() {
        const activeBtn = document.getElementById('btn-ceo-tab-main');
        if (activeBtn && activeBtn.classList.contains('bg-red-900')) {
            this.switchTab('main');
        }
    },

    // 玩家自行耗資創立公司
    openFoundModal() {
        const minCost = 5000000; // 最低五百萬元實收資本
        if (app.state.money < minCost) {
            app.log(`【資金不足】自行創業最低需具備實收資本額 $${app.formatMoney(minCost)}。`, 'text-red-500 font-bold');
            return;
        }

        // 動態抓取 data.js 裡的 13 個產業板塊
        const sectorSelect = document.getElementById('found-sector');
        if (sectorSelect && typeof DB !== 'undefined' && DB.sectors) {
            let optionsHtml = '';
            for (const [key, sector] of Object.entries(DB.sectors)) {
                optionsHtml += `<option value="${key}">${sector.name}</option>`;
            }
            sectorSelect.innerHTML = optionsHtml;
        }

        // 重置輸入框並顯示視窗
        document.getElementById('found-name').value = '';
        document.getElementById('modal-found-company').classList.remove('hidden');
    },

    // 執行創立公司扣款與創建邏輯
    executeFoundCompany() {
        const foundCost = parseInt(document.getElementById('found-capital').value) || 0;
        if (foundCost < 5000000) {
            app.log("【錯誤】最低實收資本額為 $5,000,000！", "text-red-500 font-bold");
            return;
        }
        if (app.state.money < foundCost) {
            app.log(`【資金不足】現金不足以支付 $${app.formatMoney(foundCost)} 的實收資本額。`, 'text-red-500 font-bold');
            return;
        }

        const compName = document.getElementById('found-name').value.trim();
        if (!compName) {
            app.log("【錯誤】請輸入有效的企業名稱！", "text-red-500 font-bold");
            return;
        }

        const isDomestic = document.getElementById('found-market').value === 'tw';
        const sectorKey = document.getElementById('found-sector').value;
        const sectorName = DB.sectors[sectorKey].name;

        // 扣除現金
        app.state.money -= foundCost;

        // 產生對應 ID
        let newId = isDomestic ? '8' + Math.floor(Math.random() * 900 + 100) : 'CEO' + Math.floor(Math.random() * 9000 + 1000);

        // 建立新公司股票物件
        const newShares = Math.floor(foundCost / 10); // 以每股 10 元面額換算總發行股數
        const newCorp = {
            id: newId,
            name: compName,
            sector: sectorKey,
            isListed: false,
            foundDate: new Date(app.state.date),
            initialCapital: foundCost,
            productSuccessCount: 0,
            basePrice: 10,
            price: 10,
            lastPrice: 10,
            liquidity: Math.floor(newShares * 0.05),
            beta: 1.5,
            divYield: 0,
            totalShares: newShares,
            owned: newShares,
            avgCost: 10,
            shortOwned: 0, shortAvgPrice: 0, shortMargin: 0,
            spillover: 0.1,
            isLimitUp: false, isLimitDown: false,
            corporateCash: foundCost,
            workerCount: 200, // 初始編制 200 名，避免開局遭受營運懲罰
            employees: { cto: null, cmo: null, cfo: null },
            activeProject: null,
            hasDeclared: { pct5: true, pct10: true, pct33: true, pct50: true },
            playerRole: 'CEO (創辦人)',
            companyNews: [{
                date: app.formatDateStr(app.state.date).substring(5),
                msg: `【新創啟航】${compName} 今日正式完成實收資本登記登記成立，強勢進軍「${sectorName}」產業！(目前為未上市獨角獸階段)`,
                isGood: true
            }],
            productCooldown: 0
        };

        app.state.stocks.push(newCorp);

        // 關閉 Modal
        app.closeModal('found-company');

        // 更新介面
        app.updateChartSelect();
        app.updateUI();
        app.renderMarket();
        app.renderMarginMarket();

        app.log(`【創業成功】創立 ${newCorp.name}。目前為私有化經營，請努力研發產品獲利，半年後方可申請上市。`, 'text-yellow font-bold text-lg');

        // 自動跳轉至公司經營分頁
        const newIndex = app.state.stocks.length - 1;
        this.openDashboard(newIndex);
        app.switchTab('ceo', document.getElementById('nav-ceo-tab'));
    },
    // [新增] 招募擴編研發團隊執行邏輯
    expandRNDTeam(corpId, targetTeamNum, cost) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        if (corp.corporateCash < cost) {
            app.log("【擴編失敗】公司帳上現金不足以支付團隊建置費用！", "text-red-400 font-bold");
            return;
        }

        corp.corporateCash -= cost;
        corp.rndTeamCount = targetTeamNum;

        // 更新頂部現金顯示
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;

        app.log("【研發擴編】耗資 $" + app.formatMoney(cost) + " 成功招募並建置了第 " + targetTeamNum + " 研發團隊！可多工進行立項。", "text-yellow font-bold animate-pulse");
        this.switchTab('rnd');
    },

    startRDProject(corpId, typeKey) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        const type = CEO_CONFIG.projectTypes[typeKey];
        if (!corp || !type) return;

        if (corp.rndTeamCount === undefined) corp.rndTeamCount = 1;
        if (!corp.rndProjects) corp.rndProjects = [null, null, null];

        // 尋找第一個閒置的已解鎖團隊槽位
        let targetSlotIdx = -1;
        for (let i = 0; i < corp.rndTeamCount; i++) {
            if (corp.rndProjects[i] === null) {
                targetSlotIdx = i;
                break;
            }
        }

        if (targetSlotIdx === -1) {
            app.log("【立項失敗】目前解鎖的研發團隊皆滿載運作中，請等待專案完成或耗資擴編新團隊！", "text-red-400 font-bold");
            return;
        }

        // 1. 取得現任 CEO 特質
        const ceoTraits = (corp.currentCEO && corp.currentCEO.traits) || [];
        let finalCost = type.baseCost;

        // 2. 特質效果連動：影響立項費用
        if (ceoTraits.includes('cost_cutter')) {
            finalCost *= 0.8; // 【成本殺手】立項費用降低 20%
        }
        if (ceoTraits.includes('visionary') && Math.random() < 0.2) {
            finalCost *= 1.5; // 【技術狂人】有 20% 機率研發預算超支 50%
        }

        // 3. 執行扣款 (⭕ 修正原本重複寫扣除原始 type.baseCost 的失誤)
        if (corp.corporateCash < finalCost) {
            app.log("【立項失敗】" + corp.name + " 營運資金不足以啟動 " + type.name + "。", "text-red-400");
            return;
        }

        corp.corporateCash -= finalCost;
        corp.monthExpense += finalCost;

        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;

        const typeKeys = ['paper', 'prototype', 'minor', 'major', 'revolutionary', 'moonshot'];
        const pIndex = typeKeys.indexOf(typeKey);
        // 套用客製化名稱解析
        const pNames = CEO_MODULE.getProjectNames(corp);
        const customName = pNames[pIndex];

        corp.rndProjects[targetSlotIdx] = {
            type: typeKey,
            name: customName,
            daysLeft: type.durationDays,
            totalDays: type.durationDays,
            status: 'developing',
            progress: 0
        };

        app.log("【專案啟動】" + corp.name + " 第 " + (targetSlotIdx + 1) + " 研發團隊開始研發「" + customName + "」，預計耗時 " + type.durationDays + " 天。", "text-cyan-400");
        this.switchTab('rnd');
    },

    // 每日進度更新與 AI 執行長多團隊自主營運引擎 (供 engine.js 每日呼叫)
    updateProjects() {
        const isFirstOfMonth = app.state.date.getDate() === 1;
        const pMult = app.state.priceMultiplier || 1.0;

        const baseRNDSalaryPerTeam = Math.floor(2000000 * pMult);
        const costTeam2 = Math.floor(50000000 * pMult);
        const costTeam3 = Math.floor(250000000 * pMult);

        const currentMonth = app.state.date.getMonth();

        app.state.stocks.forEach(corp => {
            if (isFirstOfMonth) {
                // --- 處理進行中的法律訴訟 ---
                if (corp.activeLawsuit) {
                    corp.activeLawsuit.monthsLeft--;
                    const legalFee = corp.activeLawsuit.monthlyCost;

                    if (corp.corporateCash >= legalFee) {
                        corp.corporateCash -= legalFee;
                    } else {
                        corp.corporateCash = 0;
                    }
                    corp.monthExpense = (corp.monthExpense || 0) + legalFee;

                    if (corp.owned > 0 || corp.shortOwned > 0) {
                        app.log(`【⚖️ 法務支出】${corp.name} 本月支付「${corp.activeLawsuit.name}」訴訟律師費 $${app.formatMoney(legalFee)} (剩餘 ${corp.activeLawsuit.monthsLeft} 個月)。`, 'text-magenta');
                    }

                    if (corp.activeLawsuit.monthsLeft <= 0) {
                        if (corp.owned > 0 || corp.shortOwned > 0) {
                            app.log(`【⚖️ 訴訟落幕】${corp.name} 的「${corp.activeLawsuit.name}」終於告一段落，產品銷售恢復正常營收水位！`, 'text-green-400 font-bold');
                        }
                        corp.activeLawsuit = null;
                    }
                }

                // --- 每季首月觸發「巨頭公關危機與法律訴訟」抽籤 ---
                if ([0, 3, 6, 9].includes(currentMonth) && !corp.pendingCrisis && !corp.activeLawsuit) {
                    const marketCap = (corp.price || 10) * (corp.totalShares || 100000000);
                    const thresholdCap = 100000000000;

                    if (marketCap >= thresholdCap && Math.random() < 0.25) {
                        const crisisTypes = [
                            { type: 'spy', name: '商業間諜竊密案', desc: '競爭對手滲透核心實驗室竊取次世代專利參數。', baseCost: 300000000, feeCost: 30000000, duration: 6 },
                            { type: 'patent', name: '大廠專利侵權指控', desc: '遭國際專利流氓與同業聯手控告關鍵技術侵權。', baseCost: 500000000, feeCost: 50000000, duration: 12 },
                            { type: 'antitrust', name: '反壟斷與反競爭調查', desc: '因市佔率過高，遭公平會與各國監管當局立案調查。', baseCost: 1000000000, feeCost: 80000000, duration: 9 }
                        ];
                        const cDef = crisisTypes[Math.floor(Math.random() * crisisTypes.length)];

                        const scaleMod = Math.max(1.0, marketCap / thresholdCap);
                        const finalSettlement = Math.floor(cDef.baseCost * scaleMod * (0.8 + Math.random() * 0.4));
                        const finalMonthlyFee = Math.floor(cDef.feeCost * scaleMod * (0.8 + Math.random() * 0.4));

                        corp.pendingCrisis = {
                            type: cDef.type, name: cDef.name, desc: cDef.desc,
                            settlementCost: finalSettlement, monthlyCost: finalMonthlyFee, duration: cDef.duration
                        };

                        const isPlayerControlled = corp.playerRole && (corp.playerRole.includes('CEO') || corp.playerRole.includes('董事長'));
                        if (isPlayerControlled) {
                            app.log(`【🚨 企業黑天鵝】${corp.name} 市值龐大樹大招風，爆發重大危機「${cDef.name}」！請立即至『公司經營』面板裁示應對方案！`, 'text-red-500 font-bold animate-pulse');
                        } else {
                            if (corp.corporateCash >= finalSettlement * 2) {
                                corp.corporateCash -= finalSettlement;
                                corp.monthExpense = (corp.monthExpense || 0) + finalSettlement;
                                corp.pendingCrisis = null;
                            } else {
                                corp.activeLawsuit = { name: cDef.name, monthlyCost: finalMonthlyFee, monthsLeft: cDef.duration };
                                corp.pendingCrisis = null;
                            }
                        }
                    }
                }
            }

            if (corp.monthRevenue === undefined) corp.monthRevenue = 0;
            if (corp.monthExpense === undefined) corp.monthExpense = 0;

            // --- 每月 1 日結算上月淨利與累進稅額 ---
            if (isFirstOfMonth) {
                if (!corp.financeHistory) corp.financeHistory = [];

                const lastMonthDate = new Date(app.state.date);
                lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

                const monthlyRev = corp.monthRevenue || 0;
                const monthlyExp = corp.monthExpense || 0;
                const preTaxProfit = monthlyRev - monthlyExp;
                let taxPaid = 0;

                if (preTaxProfit > 0) {
                    const scale = 100000000;
                    const effectiveRate = 0.10 + 0.40 * (1 - (scale / (scale + preTaxProfit)));
                    const rawTax = preTaxProfit * effectiveRate;

                    const cfo = corp.employees?.cfo;
                    const cfoBonus = cfo ? (cfo.bonus !== undefined ? cfo.bonus : Math.floor((cfo.skill || 0) / 8)) : 0;
                    const taxOptimizationRate = Math.min(0.45, cfoBonus * 0.015);
                    taxPaid = Math.floor(rawTax * (1 - taxOptimizationRate));

                    if (corp.corporateCash >= taxPaid) {
                        corp.corporateCash -= taxPaid;
                    } else {
                        taxPaid = corp.corporateCash;
                        corp.corporateCash = 0;
                    }
                    corp.monthExpense += taxPaid;

                    if (corp.owned > 0 || corp.shortOwned > 0) {
                        const savedTax = Math.floor(rawTax - taxPaid);
                        const finalRatePct = ((taxPaid / preTaxProfit) * 100).toFixed(1);
                        const optMsg = savedTax > 0 ? ` (CFO 節稅替公司省下 $${app.formatMoney(savedTax)})` : '';
                        app.log(`【企業稅務】${corp.name} 結算上月營收，按平滑曲線稅率徵收所得稅 $${app.formatMoney(taxPaid)} (實質稅負: ${finalRatePct}%)${optMsg}。`, "text-yellow");
                    }
                }

                corp.financeHistory.push({
                    year: lastMonthDate.getFullYear(),
                    month: lastMonthDate.getMonth() + 1,
                    rev: monthlyRev,
                    exp: monthlyExp, // ⭕ 切實改為純營運支出 (不含本次稅金)
                    tax: taxPaid
                });

                if (corp.financeHistory.length > 24) corp.financeHistory.shift();
                corp.monthRevenue = 0;
                corp.monthExpense = 0;
            }

            const isPlayerCEO = corp.playerRole && corp.playerRole.includes('CEO');
            const hasNPCCEO = !isPlayerCEO && corp.currentCEO;
            const ceo = corp.currentCEO;

            if (corp.rndTeamCount === undefined) corp.rndTeamCount = 1;
            if (!corp.rndProjects) {
                corp.rndProjects = [null, null, null];
                if (corp.activeProject !== undefined) {
                    corp.rndProjects[0] = corp.activeProject;
                    delete corp.activeProject;
                }
            }

            // --- 月初扣除研發團隊固定開銷 (Burn Rate) ---
            if (isFirstOfMonth && corp.corporateCash !== undefined) {
                let monthlyRNDCost = 0;
                for (let i = 1; i <= corp.rndTeamCount; i++) {
                    monthlyRNDCost += baseRNDSalaryPerTeam * Math.pow(1.5, i - 1);
                }
                const ceoTraits = (corp.currentCEO && corp.currentCEO.traits) || [];

                // 連動特質
                if (ceoTraits.includes('cost_cutter')) {
                    monthlyRNDCost *= 0.8; // 日常營運費用降低 20%
                }
                if (ceoTraits.includes('nepotism')) {
                    monthlyRNDCost *= 1.15; // 【裙帶關係】固定成本增加 15%
                }

                if (corp.corporateCash >= monthlyRNDCost) {
                    corp.corporateCash -= monthlyRNDCost;
                    corp.monthExpense += monthlyRNDCost;
                } else {
                    if (corp.rndTeamCount > 1) {
                        corp.rndTeamCount--;
                        corp.rndProjects[corp.rndTeamCount] = null;
                        if (corp.owned > 0 || corp.shortOwned > 0) {
                            app.log("【研發危機】" + corp.name + " 現金枯竭無法支付高昂研發薪資！強制解散了最後一個研發團隊以降低開銷。", "text-red-500 font-bold animate-pulse");
                        }
                    } else {
                        corp.corporateCash = 0;
                        if (corp.owned > 0 || corp.shortOwned > 0) {
                            app.log("【研發停擺】" + corp.name + " 毫無現金支付基礎研發薪資！研發團隊罷工抗議中。", "text-yellow font-bold");
                        }
                    }
                }
            }

            // --- 計算有效屬性與勞動力效益 ---
            const cto = corp.employees?.cto;
            // 【安全修復】若 workerCount 未定義或已被污染為 NaN，安全重置為預設值 200
            if (corp.workerCount === undefined || isNaN(corp.workerCount)) {
                corp.workerCount = 200;
            }
            // 確保最低不低於 0 人
            corp.workerCount = Math.max(0, corp.workerCount);
            const workers = corp.workerCount;
            const diffFromBaseline = workers - 200;

            const workerRDBonus = Math.floor(diffFromBaseline / 50);
            const workerOpsBonus = Math.floor(diffFromBaseline / 100);
            const ctoBonus = cto ? (cto.bonus !== undefined ? cto.bonus : Math.floor((cto.skill || 0) / 8)) : 0;

            const isPlayerManaged = corp.playerRole && corp.playerRole.includes('CEO');
            const baseRD = (corp.currentCEO && corp.currentCEO.stats && corp.currentCEO.stats.rd !== undefined) ? corp.currentCEO.stats.rd : (isPlayerManaged ? 80 : 0);
            const baseLead = (corp.currentCEO && corp.currentCEO.stats && corp.currentCEO.stats.leadership !== undefined) ? corp.currentCEO.stats.leadership : (isPlayerManaged ? 80 : 0);
            const baseOps = (corp.currentCEO && corp.currentCEO.stats && corp.currentCEO.stats.operations !== undefined) ? corp.currentCEO.stats.operations : (isPlayerManaged ? 80 : 0);

            const effRD = Math.max(5, baseRD + ctoBonus + workerRDBonus);
            const effLeadership = baseLead;
            const effOps = Math.max(5, baseOps + workerOpsBonus);

            let qualityPenalty = 0;
            if (workers < 100) qualityPenalty = -15;
            else if (workers < 150) qualityPenalty = -5;

            // --- 1. 研發進度與突發事件巡檢 ---
            for (let teamSlot = 0; teamSlot < corp.rndTeamCount; teamSlot++) {
                const proj = corp.rndProjects[teamSlot];

                if (proj && proj.status === 'developing') {
                    if (corp.corporateCash > 0) {
                        // 【修正】移除原有的 isPlayerControlled 過度攔截，直接使用外層已定義的 isPlayerCEO
                        // 確保玩家擔任「董事長」但交由 AI 營運時，外部執行長能正常觸發自主決策

                        // 隨機突發事件把關邏輯 (精確校正機率分流)
                        if (!proj.pendingEvent && Math.random() < 0.015) {
                            const event = CEO_CONFIG.rdEvents[Math.floor(Math.random() * CEO_CONFIG.rdEvents.length)];
                            proj.pendingEvent = event;

                            if (isPlayerCEO) {
                                app.log(`【研發突發事件】${corp.name} 團隊 #${teamSlot + 1} 遭遇狀況：「${event.name}」！開發暫停，等待高層裁示。`, 'text-yellow font-bold animate-pulse');
                                if (CEO_MODULE.currentCompanyIdx === app.state.stocks.indexOf(corp)) {
                                    CEO_MODULE.openRDEventModal(corp.id, teamSlot);
                                }
                            } else if (hasNPCCEO && ceo) {
                                // AI 執行長突發事件應對決策
                                const typeDef = CEO_CONFIG.projectTypes[proj.type];
                                const boostCost = Math.floor(typeDef.baseCost * 0.5);
                                let aiDecision = 'pivot';

                                if (corp.corporateCash >= boostCost * 4 && (ceo.stats.rd > 70 || ceo.traits.includes('perfectionist') || ceo.traits.includes('visionary'))) {
                                    aiDecision = 'boost';
                                } else if (ceo.traits.includes('hype_master') || ceo.traits.includes('wall_street_rat') || (ceo.stats.marketing > 80 && Math.random() < 0.3)) {
                                    aiDecision = 'buggy';
                                }
                                if (ceo.traits.includes('cost_cutter') && Math.random() < 0.8) {
                                    aiDecision = 'pivot';
                                }

                                let eventMsg = '';
                                if (aiDecision === 'boost') {
                                    corp.corporateCash -= boostCost;
                                    corp.monthExpense = (corp.monthExpense || 0) + boostCost;
                                    proj.qualityBonus = (proj.qualityBonus || 0) + 15;
                                    proj.pendingEvent = null;
                                    eventMsg = `批准追加預算 $${app.formatMoney(boostCost)} 克服技術難關！`;
                                    if (corp.owned > 0 || corp.shortOwned > 0) {
                                        app.log(`【AI 營運】${corp.name} 執行長 ${ceo.name} 果斷${eventMsg}`, 'text-cyan');
                                    }
                                } else if (aiDecision === 'pivot') {
                                    proj.daysLeft = Math.floor(typeDef.durationDays * 0.7);
                                    proj.pendingEvent = null;
                                    eventMsg = `啟動 Pivot 轉向機制以控制開發風險。`;
                                    if (corp.owned > 0 || corp.shortOwned > 0) {
                                        app.log(`【AI 營運】${corp.name} 執行長 ${ceo.name} ${eventMsg}`, 'text-gray-400');
                                    }
                                } else if (aiDecision === 'buggy') {
                                    proj.status = 'pending_review';
                                    proj.quality = Math.max(10, Math.floor(Math.random() * 35));
                                    proj.isBuggy = true;
                                    proj.pendingEvent = null;
                                    eventMsg = `強行要求帶有缺陷的半成品立刻完工送審！`;
                                    if (corp.owned > 0 || corp.shortOwned > 0) {
                                        app.log(`【AI 營運警告】${corp.name} 執行長 ${ceo.name} ${eventMsg}`, 'text-yellow font-bold');
                                    }
                                }

                                // 【關鍵新增】同步寫入公司專屬公告欄，讓玩家點擊純 AI 公司情報時，能切實追蹤到決策動態
                                if (!corp.companyNews) corp.companyNews = [];
                                corp.companyNews.push({
                                    date: app.formatDateStr(app.state.date).substring(5),
                                    msg: `【研發事件】團隊遭遇「${event.name}」，CEO ${ceo.name} ${eventMsg}`,
                                    isGood: aiDecision !== 'buggy'
                                });
                                if (corp.companyNews.length > 10) corp.companyNews.shift();
                            } else {
                                const typeDef = CEO_CONFIG.projectTypes[proj.type];
                                proj.daysLeft = Math.floor(typeDef.durationDays * 0.7);
                                proj.pendingEvent = null;
                            }
                        }

                        if (!proj.pendingEvent) {
                            proj.daysLeft--;
                            if (effRD > 85 && Math.random() < 0.3) proj.daysLeft--;
                            if (effOps > 80 && Math.random() < 0.15) proj.daysLeft--;
                        }
                    }

                    const typeDef = CEO_CONFIG.projectTypes[proj.type];
                    proj.progress = Math.floor(Math.max(0, 100 - (proj.daysLeft / typeDef.durationDays * 100)));

                    if (proj.daysLeft <= 0 && !proj.pendingEvent) {
                        const typeDef = CEO_CONFIG.projectTypes[proj.type];
                        const ceoTraits = (corp.currentCEO && corp.currentCEO.traits) || [];

                        // ⭕ 1. 【技術狂人】與【保守派】連動：在此處正確介入動態成功率運算
                        let finalSuccessRate = typeDef.successRate;
                        if (ceoTraits.includes('visionary') && (proj.type === 'revolutionary' || proj.type === 'moonshot')) {
                            finalSuccessRate += 0.15; // 成功率增加 15%
                        }
                        if (ceoTraits.includes('conservative')) {
                            finalSuccessRate -= 0.10; // 降低重大突破機率
                        }

                        const isSuccess = Math.random() < finalSuccessRate;
                        let baseQ = isSuccess ? (60 + Math.random() * 40) : (10 + Math.random() * 40);

                        // ⭕ 2. 【完美主義者】連動：在此處確實給予成品基礎品質 +20% 增幅
                        if (ceoTraits.includes('perfectionist')) {
                            baseQ *= 1.2;
                        }

                        baseQ += (effRD - 50) / 5;
                        baseQ += (proj.qualityBonus || 0);

                        proj.status = 'pending_review';
                        proj.quality = Math.min(100, Math.max(10, Math.floor(baseQ + (effLeadership - 50) / 10 + qualityPenalty)));

                        if (corp.playerRole && (corp.playerRole.includes('CEO') || corp.playerRole.includes('董事長'))) {
                            app.log(`【研發完成】${corp.name} 團隊 #${teamSlot + 1} 的「${proj.name}」已送交審批！`, "text-yellow font-bold");
                        }
                    }
                }
            }

            // --- 2. AI 執行長多團隊自主決策引擎 ---
            if (hasNPCCEO && ceo) {
                // A. 自主審批
                for (let teamSlot = 0; teamSlot < corp.rndTeamCount; teamSlot++) {
                    const proj = corp.rndProjects[teamSlot];
                    if (proj && proj.status === 'pending_review') {
                        const typeDef = CEO_CONFIG.projectTypes[proj.type];

                        let decision = 'launch';
                        if (proj.quality < 45 && !proj.isBuggy) {
                            if (ceo.stats.finance > 75 || ceo.traits.includes('perfectionist') || ceo.traits.includes('conservative')) {
                                decision = 'scrap';
                            }
                        }

                        if (decision === 'launch') {
                            if (!corp.launchedProducts) corp.launchedProducts = [];

                            let finalQ = proj.quality + Math.floor((ceo.stats.leadership - 50) / 10);
                            finalQ = Math.max(10, Math.min(100, finalQ));

                            const cmo = corp.employees?.cmo;
                            const cmoBonus = cmo ? (cmo.bonus !== undefined ? cmo.bonus : Math.floor((cmo.skill || 0) / 8)) : 0;
                            const effMarketing = (corp.currentCEO?.stats?.marketing || 0) + cmoBonus;
                            const marketingMult = 1.0 + (effMarketing / 500);

                            const expectedTotalRev = typeDef.baseCost * (finalQ / 40) * typeDef.revenueMult * 1.5 * marketingMult;
                            const dailyRevBase = expectedTotalRev / 200;

                            corp.launchedProducts.push({
                                name: proj.name, quality: finalQ, dailyBase: dailyRevBase, age: 0, isEvergreen: finalQ >= 92,
                                isBuggy: proj.isBuggy || false
                            });

                            let hypeBonus = (finalQ - 50) / 100 + (ceo.stats.marketing / 600);
                            if (ceo.traits.includes('hype_master')) hypeBonus += 0.15;
                            if (proj.isBuggy) hypeBonus += 0.2;

                            corp.spillover += hypeBonus;
                            corp.productSuccessCount = (corp.productSuccessCount || 0) + 1;

                            const colorClass = finalQ >= 70 ? 'text-green-400 font-bold' : 'text-yellow';
                            if (corp.owned > 0 || corp.shortOwned > 0) {
                                app.log(`【CEO 營運決策】${corp.name} 執行長推出新品「${proj.name}」！(品質: ${finalQ})`, colorClass);
                            }

                            if (!corp.companyNews) corp.companyNews = [];
                            corp.companyNews.push({
                                date: app.formatDateStr(app.state.date).substring(5),
                                msg: `【新品發布】執行長宣佈推出「${proj.name}」，引發市場熱議！`,
                                isGood: finalQ >= 50
                            });
                            if (corp.companyNews.length > 10) corp.companyNews.shift();

                            if (proj.isBuggy) {
                                const delayDays = Math.floor(5 + Math.random() * 10);
                                const targetDate = new Date(app.state.date);
                                targetDate.setDate(targetDate.getDate() + delayDays);
                                app.state.calendarEvents.push({ date: targetDate, type: 'bug_crisis', corpId: corp.id, productName: proj.name });
                            }
                        } else {
                            if (corp.owned > 0 || corp.shortOwned > 0) app.log(`【CEO 營運決策】${corp.name} 執行長果斷報廢了低階新品「${proj.name}」。`, "text-gray-500");
                        }
                        corp.rndProjects[teamSlot] = null;
                    }
                }

                // B. 戰略擴編推演
                const cash = corp.corporateCash;
                if (corp.rndTeamCount === 1 && cash >= costTeam2 * 2.5 && ceo.stats.rd > 60 && Math.random() < 0.05) {
                    corp.corporateCash -= costTeam2; corp.monthExpense += costTeam2;
                    corp.rndTeamCount = 2;
                    if (corp.owned > 0) app.log(`【CEO 戰略】${corp.name} 成立了第 2 研發團隊加速並行開發。`, "text-yellow");
                } else if (corp.rndTeamCount === 2 && cash >= costTeam3 * 3.0 && ceo.stats.rd > 80 && Math.random() < 0.02) {
                    corp.corporateCash -= costTeam3; corp.monthExpense += costTeam3;
                    corp.rndTeamCount = 3;
                    if (corp.owned > 0) app.log(`【CEO 戰略】${corp.name} 斥巨資成立終極第 3 研發團隊！`, "text-magenta");
                }

                // C. 獨立並行立項推演
                for (let teamSlot = 0; teamSlot < corp.rndTeamCount; teamSlot++) {
                    if (corp.rndProjects[teamSlot] === null && Math.random() < 0.25) {
                        let availableTypes = [];
                        const currentCash = corp.corporateCash;

                        if (currentCash >= 1500000) availableTypes.push('paper');
                        if (currentCash >= 5000000) availableTypes.push('prototype');
                        if (currentCash >= 15000000) availableTypes.push('minor');
                        if (currentCash >= 80000000) availableTypes.push('major');
                        if (currentCash >= 350000000 && (ceo.stats.rd > 65 || ceo.traits.includes('visionary'))) availableTypes.push('revolutionary');
                        if (currentCash >= 1200000000 && (ceo.stats.rd > 80 || ceo.traits.includes('visionary'))) availableTypes.push('moonshot');

                        if (availableTypes.length > 0) {
                            let selectedType = availableTypes[availableTypes.length - 1];
                            if (ceo.traits.includes('cost_cutter') && availableTypes.length > 1 && Math.random() < 0.6) {
                                selectedType = availableTypes[Math.floor(Math.random() * (availableTypes.length - 1))];
                            }

                            const typeDef = CEO_CONFIG.projectTypes[selectedType];
                            corp.corporateCash -= typeDef.baseCost; corp.monthExpense += typeDef.baseCost;

                            const typeKeys = ['paper', 'prototype', 'minor', 'major', 'revolutionary', 'moonshot'];
                            const pIndex = typeKeys.indexOf(selectedType);
                            // [修正] 確保 AI 執行長自主研發時也採用專屬產品名稱
                            const pNames = CEO_MODULE.getProjectNames(corp);
                            const customName = pNames[pIndex];

                            let duration = typeDef.durationDays;
                            if (ceo.traits.includes('perfectionist') && Math.random() < 0.3) duration += Math.floor(duration * 0.3);

                            corp.rndProjects[teamSlot] = { type: selectedType, name: customName, daysLeft: duration, totalDays: duration, status: 'developing', progress: 0 };
                            if (corp.owned > 0) app.log(`【CEO 營運】${corp.name} 執行長指派團隊研發「${customName}」。`, "text-cyan");
                        }
                    }
                }

                // D. 自主資本操作與行銷 (放寬救亡圖存與庫藏股門檻優化版)
                if (corp.isListed) {
                    const marketCap = corp.totalShares * corp.price;
                    const publicFloat = corp.totalShares - corp.owned;
                    const safeTraits = (ceo && ceo.traits) || [];

                    // 1. 緊急自救模式：現金增資 SEO (徹底移除研發專案綁定限制)
                    // 若帳上現金歸零或赤字(罷工狀態)，給予每日 15% 高機率觸發救援；若低於 2000 萬水位則給予 5% 警戒發動率
                    const isStrikingOrDead = corp.corporateCash <= 0;
                    const needsRescue = isStrikingOrDead || corp.corporateCash < 10000000;
                    const rescueProb = isStrikingOrDead ? 0.15 : 0.05;

                    if (needsRescue && Math.random() < rescueProb) {
                        // 增發流通在外股數的 8% ~ 15%
                        let seoShares = Math.floor(corp.totalShares * (0.08 + Math.random() * 0.07));
                        const subPrice = corp.price * 0.85;
                        // 【關鍵保底機制】若低價股算出的募資額過低，強制引進策略投資人保底籌得 3,000 萬救命資金
                        const cashRaised = Math.max(Math.floor(seoShares * subPrice), 10000000);

                        let oldCap = corp.totalShares * corp.price;
                        corp.totalShares += seoShares;
                        corp.corporateCash += cashRaised;
                        // 稀釋後定價結算
                        corp.price = Math.max(1, Math.floor((oldCap + cashRaised) / corp.totalShares));

                        const msg = `為挽救資金枯竭與員工流失危機，執行長緊急辦理現金增資 (SEO) 籌得 $${app.formatMoney(cashRaised)} 充實營運。`;
                        if (corp.owned > 0 || corp.shortOwned > 0) {
                            app.log(`【緊急救援】${corp.name} ${msg}`, "text-yellow font-bold");
                        }
                        if (!corp.companyNews) corp.companyNews = [];
                        corp.companyNews.push({
                            date: app.formatDateStr(app.state.date).substring(5),
                            msg: `【資本重組】${msg}`,
                            isGood: true
                        });
                        if (corp.companyNews.length > 10) corp.companyNews.shift();
                    }
                    // 2. 戰略回饋模式：庫藏股買回 Buyback
                    // 門檻大幅放寬：現金大於總市值 15% (原30%) 或絕對現金大於 8000 萬即可審議，且財務能力大於 50 即可
                    else if ((corp.corporateCash > marketCap * 0.15 || corp.corporateCash > 80000000) && (ceo.stats.finance > 50)) {
                        // 華爾街老鼠與畫餅大師更熱衷於拉抬股價
                        let buyProb = 0.04;
                        if (safeTraits.includes('wall_street_rat') || safeTraits.includes('hype_master')) buyProb += 0.04;
                        if (safeTraits.includes('conservative')) buyProb -= 0.02;

                        if (Math.random() < buyProb) {
                            let buyPct = 0.02 + (ceo.stats.finance / 2500);
                            let buyShares = Math.floor(corp.totalShares * buyPct);
                            if (buyShares > publicFloat) buyShares = Math.floor(publicFloat * 0.9);

                            let cost = buyShares * corp.price;
                            if (buyShares > 1000 && corp.corporateCash >= cost) {
                                corp.corporateCash -= cost;
                                corp.totalShares -= buyShares;
                                corp.price = Math.max(1, Math.floor(((corp.totalShares * corp.price) - cost) / corp.totalShares * 1.03));

                                const msg = `財務狀況健全，董事會決議斥資 $${app.formatMoney(cost)} 從市場買回並註銷 ${app.formatMoney(buyShares)} 股庫藏股以提升股東權益。`;
                                if (corp.owned > 0 || corp.shortOwned > 0) {
                                    app.log(`【CEO 資本】${corp.name} ${msg}`, "text-green-400 font-bold");
                                }
                                if (!corp.companyNews) corp.companyNews = [];
                                corp.companyNews.push({
                                    date: app.formatDateStr(app.state.date).substring(5),
                                    msg: `【實施庫藏股】${msg}`,
                                    isGood: true
                                });
                                if (corp.companyNews.length > 10) corp.companyNews.shift();
                            }
                        }
                    }

                    // 3. 常規行銷宣傳活動
                    if (corp.corporateCash > 20000000 && ceo.stats.marketing > 70 && Math.random() < 0.02) {
                        let mktCost = Math.floor(3000000 * pMult);
                        if (corp.corporateCash >= mktCost) {
                            corp.corporateCash -= mktCost;
                            corp.monthExpense = (corp.monthExpense || 0) + mktCost;
                            corp.spillover += 0.08 + (safeTraits.includes('hype_master') ? 0.05 : 0);
                            if (corp.owned > 0 || corp.shortOwned > 0) {
                                app.log(`【CEO 行銷】${corp.name} 斥資舉辦大型品牌發表會，顯著推升市場熱度！`, "text-magenta");
                            }
                        }
                    }
                }

                // E. AI 執行長定向獵才
                if (corp.employees && corp.corporateCash > 30000000) {
                    const headhunterFee = Math.floor(1000000 * pMult);
                    ['cto', 'cmo', 'cfo'].forEach(role => {
                        if (!corp.employees[role] && corp.corporateCash >= (headhunterFee + 20000000) && Math.random() < 0.05) {
                            corp.corporateCash -= headhunterFee; corp.monthExpense += headhunterFee;
                            const firstNames = ['艾倫', '馬克', '雪莉', '大衛', '莎拉', '詹姆斯', '凱文', '安娜', '傑克', '莉莉'];
                            const lastNames = ['史密斯', '強森', '威廉斯', '布朗', '李', '王', '張', '陳', '林', '戴維斯'];
                            const traitKeys = Object.keys(CEO_CONFIG.traits);

                            let pool = [];
                            for (let i = 0; i < 3; i++) {
                                let skill = Math.floor(Math.random() * 30) + 70;
                                pool.push({
                                    id: 'AI_EX_' + Date.now() + '_' + i,
                                    name: lastNames[Math.floor(Math.random() * lastNames.length)] + firstNames[Math.floor(Math.random() * firstNames.length)],
                                    role, skill, trait: traitKeys[Math.floor(Math.random() * traitKeys.length)],
                                    bonus: Math.floor(skill / 8), salary: skill * 30000, payType: 'cash'
                                });
                            }
                            pool.sort((a, b) => (b.skill - (CEO_CONFIG.traits[b.trait]?.isBad ? 15 : 0)) - (a.skill - (CEO_CONFIG.traits[a.trait]?.isBad ? 15 : 0)));
                            corp.employees[role] = pool[0];
                            if (corp.owned > 0) app.log(`【CEO 人事】${corp.name} 透過獵頭重金延攬頂尖主管出任 ${role.toUpperCase()}！`, "text-cyan font-bold");
                        }
                    });
                }

                // F. AI 執行長自主基層人力調度 (完美防護存檔 NaN 污染與鏈式調用中斷)
                if (isFirstOfMonth) {
                    // 確保基礎數值絕對安全
                    if (corp.workerCount === undefined || isNaN(corp.workerCount)) {
                        corp.workerCount = 200;
                    }
                    let currentWorkers = corp.workerCount;
                    const baseSalary = 45000;
                    let monthlyPayroll = currentWorkers * baseSalary;

                    // 安全提取特質陣列，防止載入時特質未定造成腳本崩潰
                    const safeTraits = (ceo && ceo.traits) || [];
                    const runwayMonths = monthlyPayroll > 0 ? (corp.corporateCash / monthlyPayroll) : 999;
                    const emergencyThreshold = safeTraits.includes('cost_cutter') ? 4.0 : 3.0;

                    // 1. 破產防禦機制：最少保留 30 人運作底線，避免歸零除錯
                    if (runwayMonths < emergencyThreshold && currentWorkers > 30) {
                        const layoffRatio = (safeTraits.includes('cost_cutter') || safeTraits.includes('iron_fist'))
                            ? (0.3 + Math.random() * 0.2)  // 裁減 30% ~ 50%
                            : (0.15 + Math.random() * 0.15); // 一般經理人裁減 15% ~ 30%

                        const layoffCount = Math.min(
                            currentWorkers - 30, // 確保底線不被擊穿
                            Math.max(10, Math.floor(currentWorkers * layoffRatio))
                        );

                        const severanceCost = safeTraits.includes('iron_fist') ? 0 : (layoffCount * baseSalary);

                        corp.workerCount = Math.max(30, corp.workerCount - layoffCount);
                        if (isNaN(corp.workerCount)) corp.workerCount = 200; // 最終防線
                        currentWorkers = corp.workerCount;
                        monthlyPayroll = currentWorkers * baseSalary;

                        if (severanceCost > 0 && corp.corporateCash >= severanceCost) {
                            corp.corporateCash -= severanceCost;
                            corp.monthExpense = (corp.monthExpense || 0) + severanceCost;
                        }

                        const msg = `為避免資金枯竭破產，緊急裁減 ${layoffCount} 名基層員工縮減開支 (剩餘編制: ${currentWorkers}人)。`;
                        if (corp.owned > 0 || corp.shortOwned > 0) {
                            app.log(`【AI 組織重組】${corp.name} 執行長 ${ceo ? ceo.name : ''} ${msg}`, 'text-red-400 font-bold');
                        }

                        if (!corp.companyNews) corp.companyNews = [];
                        corp.companyNews.push({
                            date: app.formatDateStr(app.state.date).substring(5),
                            msg: `【人事重組】啟動緊急撙節求生方案，精簡基層人力 ${layoffCount} 人。`,
                            isGood: false
                        });
                        if (corp.companyNews.length > 10) corp.companyNews.shift();
                    }

                    // 2. 常規發薪結算
                    if (corp.corporateCash >= monthlyPayroll) {
                        corp.corporateCash -= monthlyPayroll;
                        corp.monthExpense = (corp.monthExpense || 0) + monthlyPayroll;
                    } else {
                        const paidAmount = corp.corporateCash;
                        corp.corporateCash = 0;
                        corp.monthExpense = (corp.monthExpense || 0) + paidAmount;

                        app.log(`【營運警訊】${corp.name} 帳上現金徹底枯竭，積欠薪資引發員工罷工與被動離職潮！`, "text-red-500 font-bold animate-pulse");

                        if (currentWorkers > 30) {
                            corp.workerCount = Math.max(30, currentWorkers - 20);
                            if (isNaN(corp.workerCount)) corp.workerCount = 200;
                        }
                    }

                    // 3. 資金回穩與擴編邏輯 (新增：恢復性招募機制)
                    // 這裡的 runwayMonths 已在上方計算 (corp.corporateCash / monthlyPayroll)

                    // A. 恢復性招募：若人數低於 200 人基準且現金足以支撐 6 個月以上，代表渡過難關
                    if (currentWorkers < 200 && runwayMonths > 6) {
                        // 每次恢復招募 20~40 人，直到回到 200 人基準
                        const recoverCount = Math.min(200 - currentWorkers, 20 + Math.floor(Math.random() * 21));
                        corp.workerCount += recoverCount;
                        if (isNaN(corp.workerCount)) corp.workerCount = 200;

                        if (corp.owned > 0 || corp.shortOwned > 0) {
                            app.log(`【AI 營運恢復】${corp.name} 資金回穩，執行長開始重新招募員工 (${recoverCount}人)。`, 'text-green-400');
                        }
                        if (!corp.companyNews) corp.companyNews = [];
                        corp.companyNews.push({
                            date: app.formatDateStr(app.state.date).substring(5),
                            msg: `【人才回流】資金流轉正，CEO 重新招募 ${recoverCount} 名員工以恢復生產力。`,
                            isGood: true
                        });
                        if (corp.companyNews.length > 10) corp.companyNews.shift();
                    }
                    // B. 戰略性擴編：若資金極度充沛 (18個月以上) 且未達上限，追求更高增長
                    else if (currentWorkers >= 200 && currentWorkers < 1000 && runwayMonths > 18) {
                        const safeTraits = (ceo && ceo.traits) || [];
                        // 判斷擴編意願：保守派 (conservative) 較難觸發，一般或擴張型 CEO 則機率較高
                        let expandProb = safeTraits.includes('conservative') ? 0.1 : 0.4;
                        if (safeTraits.includes('visionary')) expandProb += 0.2; // 遠見者更愛擴張

                        if (Math.random() < expandProb) {
                            const addWorkers = 50;
                            corp.workerCount += addWorkers;
                            if (isNaN(corp.workerCount)) corp.workerCount = 200;

                            if (corp.owned > 0 || corp.shortOwned > 0) {
                                app.log(`【AI 擴編】${corp.name} 營運大好，執行長擴編 ${addWorkers} 名員工衝刺產能。`, 'text-cyan');
                            }
                            if (!corp.companyNews) corp.companyNews = [];
                            corp.companyNews.push({
                                date: app.formatDateStr(app.state.date).substring(5),
                                msg: `【業務擴張】公司盈利進入爆發期，增聘 ${addWorkers} 名員工擴大市場優勢。`,
                                isGood: true
                            });
                            if (corp.companyNews.length > 10) corp.companyNews.shift();
                        }
                    }
                }
            }

            // --- 3. 產品每日營收結算系統 ---
            if (corp.launchedProducts && corp.launchedProducts.length > 0) {
                let dailyTotal = 0;
                const cycleMultiplier = typeof CEO_MODULE.getSectorProfitMultiplier === 'function' ? CEO_MODULE.getSectorProfitMultiplier(corp.sector) : 1.0;
                const lawsuitPenaltyMod = corp.activeLawsuit ? 0.5 : 1.0;

                for (let i = corp.launchedProducts.length - 1; i >= 0; i--) {
                    let p = corp.launchedProducts[i];
                    p.age++;

                    let multiplier = 0;
                    if (p.quality < 40) {
                        if (p.age <= 15) multiplier = 0.8 * (1.0 - (p.age / 15));
                    } else {
                        if (p.age <= 45) multiplier = 3.0;
                        else if (p.age <= 120) multiplier = 3.0 - ((p.age - 45) / 75) * 1.8;
                        else if (p.age <= 180) multiplier = 1.2 - ((p.age - 120) / 60) * 1.0;
                        else multiplier = p.isEvergreen ? 0.5 : 0;
                    }

                    let revToday = 0;
                    if (multiplier > 0) {
                        revToday = p.dailyBase * multiplier * cycleMultiplier * lawsuitPenaltyMod;
                        dailyTotal += revToday;
                    }
                    // ⭕ 移出外層判斷之外，每日強制精確同步真實進帳 (若無倍率即自動寫入 0)
                    p.lastRev = revToday;

                    // ⭕ 同樣移出判斷之外，確保產品達標後能切實觸發下架清除
                    if (p.age > 180 && !p.isEvergreen) {
                        corp.launchedProducts.splice(i, 1);
                    }
                }

                if (dailyTotal > 0) {
                    corp.corporateCash += dailyTotal; corp.monthRevenue += dailyTotal;
                    if (CEO_MODULE.currentCompanyIdx === app.state.stocks.indexOf(corp)) {
                        const cashEl = document.getElementById('ceo-company-cash');
                        if (cashEl) cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
                    }
                }
            }
        }); // 結束 forEach 迴圈

        // 安全地在每日進度結算後，自動偵測並刷新當前正在查看的頁籤介面
        if (this.currentCompanyIdx !== null) {
            const rndBtn = document.getElementById('btn-ceo-tab-rnd');
            const mainBtn = document.getElementById('btn-ceo-tab-main');
            const flowBtn = document.getElementById('btn-ceo-tab-flow'); // 新增：抓取現金流頁籤按鈕

            // 若玩家正停留在「研發中心」頁籤，即時連動刷新進度條與剩餘天數視圖
            if (rndBtn && rndBtn.classList.contains('bg-red-900')) {
                this.switchTab('rnd');
            }
            // 若玩家正停留在「經營概況」主頁籤，同步刷新主頁裡的研發摘要與即時財務變動
            else if (mainBtn && mainBtn.classList.contains('bg-red-900')) {
                this.switchTab('main');
            }
            // 新增：若玩家正停留在「現金流明細」頁籤，隨每日推進連動刷新每日進帳與產品年齡
            else if (flowBtn && flowBtn.classList.contains('bg-red-900')) {
                this.switchTab('flow');
            }
        }
    }, // 結束 updateProjects

    // [修改] 產品最終審批發布 (加入 Bug 版產品後續的公關危機判定)
    finalizeProduct(corpId, teamSlotIdx, decision) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.rndProjects || !corp.rndProjects[teamSlotIdx]) return;

        const project = corp.rndProjects[teamSlotIdx];
        if (project.status !== 'pending_review') return;

        if (!corp.launchedProducts) corp.launchedProducts = [];

        if (decision === 'launch') {
            const type = CEO_CONFIG.projectTypes[project.type];
            const quality = project.quality;

            const cmo = corp.employees?.cmo;
            const cmoBonus = cmo ? (cmo.bonus !== undefined ? cmo.bonus : Math.floor((cmo.skill || 0) / 8)) : 0;
            const effMarketing = (corp.currentCEO?.stats?.marketing || 0) + cmoBonus;
            const marketingMult = 1.0 + (effMarketing / 500);

            const expectedTotalRev = type.baseCost * (quality / 40) * type.revenueMult * 1.5 * marketingMult;
            const dailyRevBase = expectedTotalRev / 200;

            // 推出產品
            corp.launchedProducts.push({
                name: project.name,
                quality: quality,
                dailyBase: dailyRevBase,
                age: 0,
                isEvergreen: quality >= 92,
                isBuggy: project.isBuggy || false // 繼承半成品缺陷標記
            });

            // Bug 版上市初期照樣能帶來短期熱度炒作
            let hypeGained = (quality - 50) / 100;
            if (project.isBuggy) hypeGained += 0.2; // 炒作力道更強
            corp.spillover += hypeGained;
            corp.productSuccessCount = (corp.productSuccessCount || 0) + 1;

            const color = quality >= 60 ? 'text-green-400' : 'text-yellow';
            app.log(`【新品上市】${corp.name} 團隊 #${teamSlotIdx + 1} 發布了「${project.name}」！品質：${quality}/100。`, color);

            // [關鍵新增] 如果是帶有缺陷的半成品，排程在未來 5~15 天內爆發致命公關危機
            if (project.isBuggy) {
                const delayDays = Math.floor(5 + Math.random() * 10);
                const targetDate = new Date(app.state.date);
                targetDate.setDate(targetDate.getDate() + delayDays);

                app.state.calendarEvents.push({
                    date: targetDate,
                    type: 'bug_crisis',
                    corpId: corp.id,
                    productName: project.name
                });
            }

        } else {
            app.log(`【專案報廢】高層否決了 ${corp.name} 團隊 #${teamSlotIdx + 1} 的產品發布，前期投入認列損失。`, "text-gray-500");
        }

        corp.rndProjects[teamSlotIdx] = null; // 釋放槽位
        this.switchTab('rnd');
    },

    // [修改] 開啟指定團隊槽位的審批視窗
    openReviewModal(corpId, teamSlotIdx) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.rndProjects || !corp.rndProjects[teamSlotIdx]) return;

        const proj = corp.rndProjects[teamSlotIdx];
        if (proj.status !== 'pending_review') return;

        const type = CEO_CONFIG.projectTypes[proj.type];
        const q = proj.quality;
        const rev = type.baseCost * (q / 50) * type.revenueMult;

        let qColor = q >= 80 ? 'text-green-400' : (q >= 60 ? 'text-yellow' : 'text-red-500');
        let qText = q >= 80 ? '極佳 (S級)' : (q >= 60 ? '普通 (A級)' : '瑕疵品 (C級以下)');

        document.getElementById('review-content').innerHTML = `
            <div class="border border-gray-700 bg-black p-3 mb-3">
                <div class="text-gray-400 text-xs mb-1">[團隊 #${teamSlotIdx + 1}] 專案代號與層級</div>
                <div class="text-cyan font-bold text-lg">${proj.name}</div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="border border-gray-700 bg-black p-3 text-center">
                    <div class="text-gray-400 text-xs mb-1">研發品質檢測</div>
                    <div class="${qColor} font-bold text-xl">${q} <span class="text-xs">/ 100</span></div>
                    <div class="${qColor} text-xs mt-1">${qText}</div>
                </div>
                <div class="border border-gray-700 bg-black p-3 text-center">
                    <div class="text-gray-400 text-xs mb-1">預期發布營收</div>
                    <div class="text-green-400 font-bold text-xl">$${app.formatMoney(rev)}</div>
                    <div class="text-gray-500 text-xs mt-1">成本：$${app.formatMoney(type.baseCost)}</div>
                </div>
            </div>
            <div class="text-xs text-gray-400 bg-red-900 bg-opacity-20 border border-red-800 p-2">
                <span class="text-red-400 font-bold">執行長備忘錄：</span><br>
                品質高於 60 將有效提升公司市場熱度與品牌形象；反之，強行發布瑕疵品將遭致市場負面評價。若選擇報廢，前期投入的資金將全數放水流。
            </div>
        `;

        // 綁定兩顆按鈕的點擊事件傳入正確的 teamSlotIdx
        document.getElementById('btn-review-launch').onclick = () => {
            this.finalizeProduct(corpId, teamSlotIdx, 'launch');
            app.closeModal('rnd-review');
        };
        document.getElementById('btn-review-scrap').onclick = () => {
            this.finalizeProduct(corpId, teamSlotIdx, 'scrap');
            app.closeModal('rnd-review');
        };

        document.getElementById('modal-rnd-review').classList.remove('hidden');
    }
}; // 結束 CEO_MODULE
const _originalUpdateUI = app.updateUI;
app.updateUI = function () {
    let isAnyCEO = false;

    // 每次畫面更新時，自動巡檢所有公司的股權狀態
    app.state.stocks.forEach(s => {
        if (s.totalShares > 0) {
            const pct = s.owned / s.totalShares;

            // 1. 絕對控股 (>= 50%)：自動晉升為「董事長」掌握決策權
            if (pct >= 0.5) {
                if (!s.playerRole || (!s.playerRole.includes('CEO') && !s.playerRole.includes('董事長'))) {
                    s.playerRole = s.foundDate ? '董事長 (創辦人)' : '董事長';
                    app.log(`【經營權變動】您已取得 ${s.name} 過半股權成為董事長！可隨時至『現任 CEO』頁籤選擇是否親自取代原執行長。`, 'text-yellow font-bold');
                }
            }
            // 2. 喪失董事席次 (< 30%)：強制拔除 CEO / 董事長 職務
            else if (pct < 0.3 && s.playerRole && (s.playerRole.includes('CEO') || s.playerRole.includes('董事長'))) {
                s.playerRole = pct > 0 ? '大股東' : '散戶';
                app.log(`【經營權變動】您在 ${s.name} 的股權跌破 30%，喪失公司主導權！`, 'text-red-500 font-bold');
                if (CEO_MODULE.currentCompanyIdx === app.state.stocks.indexOf(s)) {
                    CEO_MODULE.currentCompanyIdx = null;
                }
            }
            // 3. 介於 30% ~ 50% 之間：維持現狀
            else if (!s.playerRole || (!s.playerRole.includes('CEO') && !s.playerRole.includes('董事長') && pct > 0)) {
                s.playerRole = '大股東';
            }

            if (s.owned === 0) s.playerRole = '散戶';

            // 檢查是否擁有 CEO 或董事長頭銜，以保持營運導覽頁籤開啟
            if (s.playerRole && (s.playerRole.includes('CEO') || s.playerRole.includes('董事長'))) {
                isAnyCEO = true;
            }
        }
    });

    // 動態控制 CEO 頁籤的顯示與隱藏
    const ceoTabBtn = document.getElementById('nav-ceo-tab');
    if (ceoTabBtn) {
        if (isAnyCEO) {
            ceoTabBtn.classList.remove('hidden');
        } else {
            ceoTabBtn.classList.add('hidden');
            if (ceoTabBtn.classList.contains('active')) {
                // 安全退回市場頁面
                const marketBtn = document.querySelector('.tab-btn');
                if (marketBtn) app.switchTab('market', marketBtn);
            }
        }
    }

    // 同步更新「公司資訊 Modal」裡的身分顯示
    const boardRoleEl = document.getElementById('ci-board-role');
    const boardPctEl = document.getElementById('ci-board-pct'); // 👈 新增抓取百分比 UI
    const idEl = document.getElementById('ci-id');
    if (boardRoleEl && idEl) {
        const activeModalStock = app.state.stocks.find(s => s.id === idEl.innerText);
        if (activeModalStock) {
            boardRoleEl.innerText = activeModalStock.playerRole || '散戶';
            // 👈 動態精確計算當前持股比例並同步刷新
            if (boardPctEl && activeModalStock.totalShares) {
                const currentPct = (activeModalStock.owned / activeModalStock.totalShares) * 100;
                boardPctEl.innerText = `${currentPct < 0.00001 ? '< 0.00001' : currentPct.toFixed(4)}%`;
            }
        }
    }

    if (_originalUpdateUI) {
        _originalUpdateUI.call(app);
    }
};