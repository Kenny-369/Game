// ceo_pharma.js - 生技與醫療產業（四大商業模型）核心模擬子系統

const CEO_PHARMA = {
    // ==========================================
    // 1. 初始化資產 (Init Assets)
    // ==========================================
    initAssets(corp) {
        if (!corp.pharmaState) {
            corp.pharmaState = {
                // 通用生技狀態
                bciDailyEffect: 1.0,
                
                // 新藥研發 (innovator)
                activePipelines: [],  // 進行中的臨床專案: { id, name, phase, daysLeft, cost, successRateBoost }
                launchedDrugs: [],     // 已上市的專利藥物: { id, name, type, dailyRevBase, age }
                
                // 生技代工 (cdmo)
                reactors: [],          // 細胞反應器陣列: { id, capacity, dailyMaint }
                qaExpense: 20000,      // 每日 QA/QC 品管維持費 (預設常規品管)
                backlog: [],           // 代工在手訂單: { id, clientName, type, daysLeft, price }
                fda整改剩餘天數: 0,     // 因查廠未過而勒令停工整改的剩餘天數
                
                // 學名藥與特藥 (generics)
                unlockedGenerics: [],  // 逆向仿製成功的學名藥: { id, name, originPrice }
                activeReverseEngineering: null, // 正在逆向仿製的專案
                hospitalTenders: [],   // 目前供應中的醫院標案合約: { id, name, dailyRev, dailyCost, daysLeft }
                tenderDiscount: 50,    // 標案折扣率百分比 (拉桿)
                
                // 高階醫材與保健 (medtech)
                installedBase: 0,      // 醫院已裝機覆蓋率 (累積裝機台數)
                pricingStrategy: 'normal', // 裝機策略: 'normal' (原價銷售), 'subsidy' (補貼免費送)
                pendingInstalls: []    // 待裝機中的醫院清單
            };
        }

        const state = corp.pharmaState;
        const p = corp.price || corp.basePrice || 100;
        const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;

        // 玩家創立之公司為空殼公司，不給予初始資源 (依據 user_rules)
        if (corp.isPlayerFounded) {
            if (corp.bizModel === 'cdmo') {
                state.reactors = [{ id: `R-${Date.now()}`, capacity: 2000, dailyMaint: 20000 }];
            } else if (corp.bizModel === 'medtech') {
                state.installedBase = 2; // 給予 2 台基礎裝機量
            }
            return;
        }

        // ==========================================
        // 非玩家（上市公司）根據規模給予初始航線與資源
        // ==========================================
        
        // A. 新藥研發 (innovator)
        if (corp.bizModel === 'innovator') {
            if (['LLY', 'NVO'].includes(corp.id)) { // 減肥藥雙雄 (禮來、諾和諾德)
                state.launchedDrugs.push({ 
                    id: `D-${Date.now()}-GLP1`, 
                    name: corp.id === 'LLY' ? 'Mounjaro 減肥注射劑' : 'Wegovy 瘦身針', 
                    type: 'glp1', 
                    dailyRevBase: 1500000 + scale * 100000, 
                    age: 180 
                });
            } else if (corp.id === 'MRNA') { // 莫德納
                state.launchedDrugs.push({ 
                    id: `D-${Date.now()}-mRNA`, 
                    name: 'Spikevax 次世代新冠疫苗', 
                    type: 'vaccine', 
                    dailyRevBase: 800000 + scale * 50000, 
                    age: 365 
                });
            } else if (['PFE', 'MRK', 'AZN'].includes(corp.id)) { // 國際藥廠三巨頭
                state.launchedDrugs.push({ 
                    id: `D-${Date.now()}-blockbuster`, 
                    name: '重磅暢銷原廠抗癌藥', 
                    type: 'cancer', 
                    dailyRevBase: 1000000 + scale * 80000, 
                    age: 500 
                });
            } else { // 台灣新藥廠 (浩鼎、高端、合一、藥華藥等)
                if (corp.id === '6446') { // 藥華藥
                    state.launchedDrugs.push({ id: `D-${Date.now()}-blood`, name: '百斯瑞明 真性紅血球增多症新藥', type: 'blood', dailyRevBase: 350000, age: 100 });
                } else if (corp.id === '4743') { // 合一
                    state.launchedDrugs.push({ id: `D-${Date.now()}-wound`, name: '速傷悅 糖尿病足部傷口潰瘍新藥', type: 'wound', dailyRevBase: 250000, age: 120 });
                } else {
                    // 其餘開局只注入一期或二期臨床
                    state.activePipelines.push({
                        id: `P-${Date.now()}`,
                        name: '次世代小分子靶向抗癌藥',
                        phase: 2,
                        daysLeft: 30,
                        cost: 25000000,
                        successRateBoost: 0
                    });
                }
            }
        }
        
        // B. 生技代工 (cdmo)
        else if (corp.bizModel === 'cdmo') {
            if (corp.id === '6472') { // 保瑞
                state.reactors = [
                    { id: `R-${Date.now()}-1`, capacity: 10000, dailyMaint: 70000 },
                    { id: `R-${Date.now()}-2`, capacity: 2000, dailyMaint: 20000 }
                ];
                state.backlog.push({ id: `B-1`, clientName: '美商大廠', type: '抗體蛋白代工生產案', daysLeft: 12, price: 40000000 });
            } else if (corp.id === '6589') { // 台康生技
                state.reactors = [
                    { id: `R-${Date.now()}-1`, capacity: 2000, dailyMaint: 20000 },
                    { id: `R-${Date.now()}-2`, capacity: 2000, dailyMaint: 20000 }
                ];
                state.backlog.push({ id: `B-1`, clientName: '默克', type: '生物相似藥受託生產', daysLeft: 22, price: 25000000 });
            } else {
                state.reactors.push({ id: `R-${Date.now()}`, capacity: 2000, dailyMaint: 20000 });
            }
        }
        
        // C. 學名藥與特藥 (generics)
        else if (corp.bizModel === 'generics') {
            if (corp.id === '1795') { // 美時
                state.unlockedGenerics.push({ name: 'Lenalidomide 血癌仿製藥', originPrice: 3500 });
                state.hospitalTenders.push({ id: `T-1`, name: '血癌學名藥全台標案', dailyRev: 220000, dailyCost: 40000, daysLeft: 80 });
            } else {
                state.unlockedGenerics.push({ name: '阿斯匹靈特藥學名藥', originPrice: 40 });
                state.hospitalTenders.push({ id: `T-1`, name: '基礎三高特用學名藥標案', dailyRev: 80000, dailyCost: 15000, daysLeft: 40 });
            }
        }
        
        // D. 高階醫材與保健 (medtech)
        else if (corp.bizModel === 'medtech') {
            state.installedBase = scale * 10 + 5; // 根據規模發配裝機台數
        }
    },

    // ==========================================
    // 2. UI 渲染派發 (Render)
    // ==========================================
    renderPharmaTab(corp, contentArea, isReadOnly) {
        if (!corp.pharmaState) this.initAssets(corp);
        let html = `<div class="p-4 bg-black border border-gray-800 rounded crt">`;
        
        let bci = app.state.BCI || 100;
        let bciColor = bci >= 100 ? 'text-green-400 font-bold' : 'text-red-400 font-bold';
        
        // 頂部全域景氣與政策補貼橫幅
        html += `<div class="mb-4 text-xs text-gray-300 bg-gray-900 bg-opacity-80 p-3 rounded border border-gray-800 flex justify-between items-center shadow-[inset_0_0_10px_rgba(0,255,0,0.05)]">
            <div>📊 全球生技景氣與政策指數 (BCI): <span class="${bciColor}">${bci.toFixed(1)}%</span></div>
            <div class="text-xs text-gray-400">※ 影響解盲臨床資金籌措、FDA查廠頻率與醫院健保招標額度</div>
        </div>`;

        // 生技醫療扶持政策（新創補貼對齊）
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        if (isFirstYearSubsidized) {
            html += `<div class="mb-4 text-xs bg-green-950 bg-opacity-30 p-3 rounded border border-green-700 text-green-400 flex flex-col gap-1 shadow-[0_0_15px_rgba(0,255,0,0.1)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🟢 國家生技與醫療產業扶持法案生效中 (上市/創立前三個月特別護航)</div>
                <div class="text-xs text-gray-300">※ 享有：日常人事與營運折舊成本減免 50% 政策補貼。</div>
                <div class="text-xs text-gray-300">※ 享有：研發推進與擴產立項 20% 資金大額減免。</div>
                ${['wafer', 'substrate', 'osat', 'generics', 'medtech'].includes(corp.pharmaState.subModel || corp.bizModel) ? `<div class="text-xs text-yellow-500 font-bold">※ 特許補貼：因前期市場通路尚未打開，國家每日撥發特許起航保證收購金！</div>` : ''}
            </div>`;
        }

        // 根據 business model 進行 UI 分流
        if (corp.bizModel === 'innovator') {
            html += this.renderInnovatorUI(corp, isReadOnly);
        } else if (corp.bizModel === 'cdmo') {
            html += this.renderCdmoUI(corp, isReadOnly);
        } else if (corp.bizModel === 'generics') {
            html += this.renderGenericsUI(corp, isReadOnly);
        } else if (corp.bizModel === 'medtech') {
            html += this.renderMedtechUI(corp, isReadOnly);
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // ==========================================
    // 2-A. 新藥研發 (innovator) 面板
    // ==========================================
    renderInnovatorUI(corp, isReadOnly) {
        const state = corp.pharmaState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-cyan font-bold mb-2 text-md flex items-center gap-1">🔬 新藥研發 (innovator) 臨床決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">本夢比最高、風險最暴力的賭局。臨床一期到三期所需的資金高達 5 倍跳升。解盲一旦失敗前期投資全數打水漂；成功則可取得 FDA 藥證，獲得長達 10 年的原廠藥天價營收利潤！</p>`;

        // A. 推進臨床實驗按鈕
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🧬 推動新藥臨床實驗 (Clinical Pipeline)</h4>`;
        
        // 晶片法案補貼下，立項費用減免 20%
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let ph1Cost = isFirstYearSubsidized ? 4000000 : 5000000;
        let ph2Cost = isFirstYearSubsidized ? 20000000 : 25000000;
        let ph3Cost = isFirstYearSubsidized ? 100000000 : 125000000;

        if (!isReadOnly) {
            html += `<div class="grid grid-cols-3 gap-2 mb-4">
                <button ${disabledAttr} onclick="CEO_PHARMA.startClinical('${corp.id}', 1)" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-cyan border-opacity-40 text-left transition hover:border-cyan">
                    <div class="text-cyan text-xs font-bold">🧪 啟動臨床一期 (Phase I)</div>
                    <div class="text-xs text-gray-400 mt-1">目的: 臨床安全性測試</div>
                    <div class="text-xs text-yellow font-bold mt-1">費用: $${app.formatMoney(ph1Cost)} | 耗時: 30天</div>
                    <div class="text-xs text-green-400 mt-1">預估通過率: 85%</div>
                </button>
                <button ${disabledAttr} onclick="CEO_PHARMA.startClinical('${corp.id}', 2)" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-green-700 border-opacity-40 text-left transition hover:border-green-400">
                    <div class="text-green-400 text-xs font-bold">🧪 啟動臨床二期 (Phase II)</div>
                    <div class="text-xs text-gray-400 mt-1">目的: 小規模有效性評估</div>
                    <div class="text-xs text-yellow font-bold mt-1">費用: $${app.formatMoney(ph2Cost)} | 耗時: 45天</div>
                    <div class="text-xs text-green-400 mt-1">預估通過率: 55%</div>
                </button>
                <button ${disabledAttr} onclick="CEO_PHARMA.startClinical('${corp.id}', 3)" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-purple-800 border-opacity-40 text-left transition hover:border-purple-500">
                    <div class="text-purple-400 text-xs font-bold">🧪 啟動臨床三期 (Phase III)</div>
                    <div class="text-xs text-gray-400 mt-1">目的: 大規模雙盲有效性解盲</div>
                    <div class="text-xs text-yellow font-bold mt-1">費用: $${app.formatMoney(ph3Cost)} | 耗時: 90天</div>
                    <div class="text-xs text-red-400 font-bold mt-1">基礎成功率: 30%</div>
                </button>
            </div>`;
        }

        // B. 進行中的臨床進度
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 mb-6 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.activePipelines.length > 0) {
            state.activePipelines.forEach(p => {
                let phaseColor = p.phase === 3 ? 'text-purple-400 animate-pulse' : (p.phase === 2 ? 'text-green-400' : 'text-cyan');
                let boostText = p.phase === 3 ? `<span class="text-green-400 ml-2 font-bold">(成功率加成: +${p.successRateBoost || 0}%)</span>` : '';
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2.5 last:border-0">
                    <div>
                        <div class="${phaseColor} font-bold">${p.name} (臨床第 ${p.phase} 期) ${boostText}</div>
                        <div class="text-xs text-gray-400 mt-0.5">立項開銷: -$${app.formatMoney(p.cost)}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-yellow font-mono font-bold">研發推進中... 剩餘 ${p.daysLeft} 天</div>
                        ${(!isReadOnly && p.phase === 2) ? `
                            <button onclick="CEO_PHARMA.outLicense('${corp.id}', '${p.id}')" class="btn-retro text-xs px-2 py-0.5 border-yellow-700 text-yellow mt-1 font-bold">
                                🤝 提早售予大廠授權金 ($80M)
                            </button>
                        ` : ''}
                        ${(!isReadOnly && p.phase === 3) ? `
                            <button onclick="CEO_PHARMA.boostPhase3('${corp.id}', '${p.id}')" class="btn-retro text-xs px-2 py-0.5 border-purple-500 text-purple-400 mt-1 font-bold">
                                🤖 灌注 AI 大數據篩選 (-$30M，成功率 +8%)
                            </button>
                        ` : ''}
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有推進中的臨床實驗進度。</div>`;
        }
        html += `</div>`;

        // C. 已取得藥證上市的重磅原廠專利藥物
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">💊 專利原廠藥物銷售分成 (Patent Revenue)</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.launchedDrugs.length > 0) {
            state.launchedDrugs.forEach(d => {
                let ageYear = Math.floor(d.age / 365);
                let decay = Math.max(0.1, 1 - (d.age / 3650)); // 10年專利懸崖衰退
                let sci = app.state.BCI || 100;
                let currentDaily = d.dailyRevBase * decay * (sci / 100);
                
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2.5 last:border-0">
                    <div>
                        <div class="text-green-400 font-bold">${d.name}</div>
                        <div class="text-xs text-gray-400 mt-0.5">上市日數: ${d.age} 天 (專利已耗損 ${ageYear} 年) | 生產力剩餘: ${(decay*100).toFixed(0)}%</div>
                    </div>
                    <div class="text-right">
                        <div class="text-green-400 font-mono font-bold">被動日營收: +$${app.formatMoney(currentDaily)}</div>
                        <div class="text-xs text-gray-400">外包 CDMO 生產成本: -$${app.formatMoney(currentDaily * 0.15)}</div>
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前無上市藥物，公司尚未獲得長期被動專利分成營收。</div>`;
        }
        html += `</div>`;

        return html;
    },

    // ==========================================
    // 2-B. 生技代工 (cdmo) 面板
    // ==========================================
    renderCdmoUI(corp, isReadOnly) {
        const state = corp.pharmaState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        // 計算反應器總產能
        let totalCap = state.reactors.reduce((a,b) => a + b.capacity, 0);
        let activeOrders = state.backlog.length;

        let html = `<h3 class="text-green-400 font-bold mb-2 text-md">🏭 生技代工 (CDMO) 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">不承擔新藥解盲生死的生技界台積電。透過擴張大型細胞培養反應器承接全球大廠委託，並需精準投入 QC/QA 品管費以安然通過 FDA 的突擊查廠監管危機！</p>`;

        // A. 基本產能狀況
        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">生物反應槽總產能</div>
                <div class="text-green-400 font-mono font-bold text-md mt-0.5">${totalCap.toLocaleString()} L</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">品管 QA/QC 級別</div>
                <div class="text-yellow-400 font-bold text-xs mt-1">
                    ${state.qaExpense >= 60000 ? '🥇 高精準無瑕' : (state.qaExpense >= 20000 ? '🥈 常規品管' : '🥉 低度品管')}
                </div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">FDA 監管狀態</div>
                <div class="font-mono text-xs mt-1 ${state.fda整改剩餘天數 > 0 ? 'text-red-500 font-bold animate-pulse' : 'text-green-400'}">
                    ${state.fda整改剩餘天數 > 0 ? `🚫 停工整改中 (${state.fda整改剩餘天數}天)` : '🟢 FDA 通過認證'}
                </div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 擴增產能 (細胞槽培養槽)
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🏗️ 擴增細胞反應器產能 (Bioreactor CapEx)</h4>`;
            
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            let react2000Cost = isFirstYearSubsidized ? 32000000 : 40000000;
            let react10000Cost = isFirstYearSubsidized ? 120000000 : 150000000;

            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <button ${disabledAttr} onclick="CEO_PHARMA.buyReactor('${corp.id}', 2000)" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-green-900 border-opacity-40 text-left transition hover:border-green-400">
                    <div class="font-bold text-green-400 text-xs">🧪 擴張中型反應器 (2,000L)</div>
                    <div class="text-xs text-gray-400 mt-1">提供中等代工量能，每日折舊維護: -$20k</div>
                    <div class="text-yellow font-bold text-xs mt-1.5">擴建費: $${app.formatMoney(react2000Cost)}</div>
                </button>
                <button ${disabledAttr} onclick="CEO_PHARMA.buyReactor('${corp.id}', 10000)" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2.5 rounded border border-green-900 border-opacity-40 text-left transition hover:border-green-400">
                    <div class="font-bold text-green-400 text-xs">🧪 擴建旗艦級反應槽 (10,000L)</div>
                    <div class="text-xs text-gray-400 mt-1">大量產能解鎖，每日折舊維護: -$70k</div>
                    <div class="text-yellow font-bold text-xs mt-1.5">擴建費: $${app.formatMoney(react10000Cost)}</div>
                </button>
            </div>`;

            // C. 品管 QA/QC 調配
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🛡️ 美國 FDA 突擊查廠品管防線 (QA/QC Controls)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <p class="text-xs text-gray-400 mb-3.5">設定每日品管費比重。當 FDA 官員無預警突擊查廠時，低度品管有高達 70% 機率被發出警告信並強制全面停工整改 3 個月！</p>
                <div class="grid grid-cols-3 gap-2">
                    <button ${disabledAttr} onclick="CEO_PHARMA.setQAExpense('${corp.id}', 5000)" class="${disabledClass} btn-retro py-1.5 text-xs ${state.qaExpense === 5000 ? 'border-red-500 text-red-500 bg-red-950 bg-opacity-20 font-bold' : ''}">🥉 低度品管 ($5k/日)</button>
                    <button ${disabledAttr} onclick="CEO_PHARMA.setQAExpense('${corp.id}', 20000)" class="${disabledClass} btn-retro py-1.5 text-xs ${state.qaExpense === 20000 ? 'border-yellow-500 text-yellow bg-yellow-950 bg-opacity-20 font-bold' : ''}">🥈 常規品管 ($20k/日)</button>
                    <button ${disabledAttr} onclick="CEO_PHARMA.setQAExpense('${corp.id}', 60000)" class="${disabledClass} btn-retro py-1.5 text-xs ${state.qaExpense === 60000 ? 'border-green-500 text-green-400 bg-green-950 bg-opacity-20 font-bold' : ''}">🥇 高無瑕品管 ($60k/日)</button>
                </div>
            </div>`;
        }

        // D. 代工在手訂單 Backlog 呈現
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">📋 生物製劑代工合約 Backlog (${activeOrders} 案進行中)</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.backlog.length > 0) {
            state.backlog.forEach(b => {
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2.5 last:border-0 text-gray-300">
                    <div>
                        <div class="text-green-400 font-bold">${b.type} <span class="text-gray-400 text-xs ml-1">(${b.clientName})</span></div>
                        <div class="text-xs text-gray-400 mt-0.5">合約交割金: $${app.formatMoney(b.price)}</div>
                    </div>
                    <div class="text-yellow-400 font-mono font-bold animate-pulse text-right">
                        生產製備中... 剩餘 ${b.daysLeft} 天
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有已排程的生物製劑代工合約。</div>`;
        }
        html += `</div>`;

        return html;
    },

    // ==========================================
    // 2-C. 學名藥與特藥 (generics) 面板
    // ==========================================
    renderGenericsUI(corp, isReadOnly) {
        const state = corp.pharmaState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-yellow-400 font-bold mb-2 text-md">💊 學名藥與特藥 (Generics) 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">承接國際大廠專利過期後之學名藥逆向仿製，避開高風險研發投入。這是一場比拼健保招標價格戰與醫院通路佔有率的殘酷成本利潤微操！</p>`;

        // A. 專利懸崖雷達與逆向仿製開發
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-500 pl-1.5">📡 國際原廠大藥專利過期雷達 (Patent Cliff Radar)</h4>`;
        html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 mb-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] text-xs text-gray-300">`;
        
        let patentCliffPool = app.state.patentCliffPool || [];
        if (patentCliffPool.length > 0) {
            patentCliffPool.forEach(p => {
                let is仿製中 = state.activeReverseEngineering && state.activeReverseEngineering.name === p.name;
                let is已解鎖 = state.unlockedGenerics.some(g => g.name === p.name);
                
                let actionBtn = '';
                if (is已解鎖) {
                    actionBtn = `<span class="text-green-400 font-bold">🟢 已成功仿製 (可投標)</span>`;
                } else if (is仿製中) {
                    actionBtn = `<span class="text-yellow-400 font-bold animate-pulse">🧪 逆向工程仿製中 (${state.activeReverseEngineering.daysLeft}天)</span>`;
                } else if (!isReadOnly) {
                    // 第一年立項減免 20%
                    let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
                    let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
                    let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
                    let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
                    let reverseCost = isFirstYearSubsidized ? 24000000 : 30000000;

                    actionBtn = `<button onclick="CEO_PHARMA.startReverseEngineering('${corp.id}', '${p.name}')" class="btn-retro text-xs px-2 py-0.5 border-yellow-500 text-yellow font-bold">
                        🔬 逆向仿製開發 (-$${app.formatMoney(reverseCost)})
                    </button>`;
                }

                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2.5 last:border-0">
                    <div>
                        <div class="text-yellow font-bold">${p.name}</div>
                        <div class="text-xs text-gray-400 mt-0.5">原廠: ${p.company} | 原廠日銷售額: $${app.formatMoney(p.dailyRevBase)}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-gray-300 font-mono">原廠專利剩餘: <span class="text-red-400 font-bold">${p.daysLeft} 天</span></div>
                        <div class="mt-1">${actionBtn}</div>
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">專利雷達無訊號，目前無原廠專利即將過期。</div>`;
        }
        html += `</div>`;

        // B. 標案折扣率拉桿 (Tender Bidding)
        if (!isReadOnly) {
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-500 pl-1.5">⚖️ 醫院採購標案折扣率控制 (Tender Discount)</h4>`;
            html += `<div class="bg-gray-950 p-3 rounded border border-yellow-800 border-opacity-40 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-xs text-gray-400 mb-3">拉動拉桿設定投標折扣。折扣拉得越高（如打 1-2 折，折扣 80%-90%），中標率越高但毛利極低；折扣越低（如打 9 折）毛利極高但有高達 85% 機率流標，日營收為零。</div>
                <div class="flex gap-4 items-center">
                    <input type="range" min="10" max="95" step="5" value="${state.tenderDiscount}" 
                           onchange="CEO_PHARMA.changeTenderDiscount('${corp.id}', this.value)"
                           oninput="document.getElementById('tender-val-discount').innerText = this.value + '% (打' + ((100-this.value)/10).toFixed(1) + '折)'; document.getElementById('tender-val-chance').innerText = (this.value*0.95).toFixed(0) + '%';"
                           class="w-2/3 cursor-pointer accent-yellow-500">
                    <div class="text-xs text-gray-300 font-mono">
                         <div>投標折扣率: <span id="tender-val-discount" class="text-yellow font-bold">${state.tenderDiscount}% (打${((100-state.tenderDiscount)/10).toFixed(1)}折)</span></div>
                         <div>預估中標率: <span id="tender-val-chance" class="text-green-400 font-bold">${(state.tenderDiscount*0.95).toFixed(0)}%</span></div>
                    </div>
                </div>
            </div>`;
        }

        // C. 已承包供貨中的醫院標案 (Hospital Contracts)
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-yellow-500 pl-1.5">🏥 承包供貨中之全台醫院採購標案</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.hospitalTenders.length > 0) {
            state.hospitalTenders.forEach(t => {
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2.5 last:border-0 text-gray-300">
                    <div>
                        <div class="text-yellow font-bold">${t.name}</div>
                        <div class="text-xs text-gray-400 mt-0.5">生產成本支出: -$${app.formatMoney(t.dailyCost)}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-green-400 font-mono font-bold">合約日營收: +$${app.formatMoney(t.dailyRev)}</div>
                        <div class="text-xs text-yellow-500">合約到期: 剩餘 ${t.daysLeft} 天</div>
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有得標供貨中的醫院標案合約。請研發學名藥並拉高折扣率。</div>`;
        }
        html += `</div>`;

        return html;
    },

    // ==========================================
    // 2-D. 高階醫材與保健 (medtech) 面板
    // ==========================================
    renderMedtechUI(corp, isReadOnly) {
        const state = corp.pharmaState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-purple-400 font-bold mb-2 text-md">🦾 高階醫材與綜合保健 (MedTech) 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">依靠「刮鬍刀與刀片」的穩健長尾保護費模式。CEO 可以花錢大量補貼將檢測機台/手術手臂「免費」送進大醫院圈地，再依靠醫院每日消耗的拋棄式刀片與試劑收取源源不絕的保護費！</p>`;

        // A. 基本裝機覆蓋率
        html += `<div class="grid grid-cols-2 gap-3 mb-5">
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">全台/全球醫院手術手臂累積裝機數</div>
                <div class="text-purple-400 font-bold text-lg mt-0.5">${state.installedBase} 台</div>
            </div>
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">消耗品/試劑每日收益 (保護費)</div>
                <div class="text-green-400 font-mono font-bold text-lg mt-0.5">+$${app.formatMoney(state.installedBase * 1500)} /日</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            // B. 裝機圈地決策
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">🤝 手術機器人裝機覆蓋與補貼決策 (Installed Base Marketing)</h4>`;
            
            // 第一年立項減免 20%
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            let subsidyCost = isFirstYearSubsidized ? 12000000 : 15000000;

            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-cyan text-xs">【常規原價銷售模式】</div>
                        <p class="text-xs text-gray-400 mt-1">以每台 $2,000,000 的價格正常向大型教學醫院銷售。無初期現金補貼，但醫院採購審查流程冗長，每季僅能極慢增加 1 ~ 2 台。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_PHARMA.buyMedtechInstall('${corp.id}', 'normal')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-cyan text-cyan hover:bg-cyan-955 hover:text-white font-bold transition">
                        原價銷售裝機 (售價 +$2,000,000)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-purple-400 text-xs">【大額補貼免費送機模式】</div>
                        <p class="text-xs text-gray-400 mt-1">耗費重資補貼完全免費將達文西手術手臂送進各大醫院，圈地覆蓋！引發大轉單，每日賺取高額耗材分成。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_PHARMA.buyMedtechInstall('${corp.id}', 'subsidy')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-purple-500 text-purple-400 hover:bg-purple-955 hover:text-white font-bold transition">
                        免費贈送快速裝機 (-$${app.formatMoney(subsidyCost)})
                    </button>
                </div>
            </div>`;
        }

        // C. 排程裝機進度
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">🏥 待出貨裝機之醫院合約排程</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.pendingInstalls.length > 0) {
            state.pendingInstalls.forEach(p => {
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2 last:border-0 text-gray-300">
                    <span>🏢 跨國教學醫院手術室裝機案 <span class="text-gray-400">(${p.strategy === 'subsidy' ? '大額補貼免裝機' : '原價合約銷售'})</span></span>
                    <span class="text-yellow font-mono font-bold animate-pulse">運裝校正中... 剩 5 天</span>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前無排程運送中的新機台安裝案件。</div>`;
        }
        html += `</div>`;

        return html;
    },

    // ==========================================
    // 3. 玩家操作互動 (Actions)
    // ==========================================
    
    // A. 啟動臨床實驗 (startClinical)
    startClinical(corpId, phase) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.pharmaState) return;

        const state = corp.pharmaState;
        
        // 限制同時僅能進行一個臨床實驗專案
        if (state.activePipelines.length > 0) {
            app.log("【臨床限制】目前研發實驗室已有一項進行中的臨床專案，請等待解盲結果！", "text-red-500");
            return;
        }

        let cost = 0; let days = 0; let name = '';
        if (phase === 1) { cost = 5000000; days = 30; name = '臨床一期 (安全性)'; }
        else if (phase === 2) { cost = 25000000; days = 45; name = '臨床二期 (有效性)'; }
        else if (phase === 3) { cost = 125000000; days = 90; name = '臨床三期 (雙盲盲測)'; }

        // 第一年政策減免 20%
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            state.activePipelines.push({
                id: `P-${Date.now()}`,
                name: corp.name + '特用靶向新藥',
                phase: phase,
                daysLeft: days,
                cost: finalCost,
                successRateBoost: 0
            });
            let subsidyMsg = isFirstYearSubsidized ? ` (獲生技扶持法案研發補貼 20% 減免)` : '';
            app.log(`【臨床立項】${corp.name} 斥資 $${app.formatMoney(finalCost)}${subsidyMsg} 正式啟動 [${name}]！預計工期為 ${days} 天。`, "text-cyan font-bold");
            this.refreshPharmaTabUI(corp);
        } else {
            app.log(`【資金不足】公司帳上現金不足以支付臨床費用！需要 $${app.formatMoney(finalCost)}。`, "text-red-500");
        }
    },

    // B. 新藥臨床二期授權 (outLicense)
    outLicense(corpId, pipelineId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.pharmaState) return;

        const state = corp.pharmaState;
        const pIdx = state.activePipelines.findIndex(x => x.id === pipelineId);
        if (pIdx === -1) return;

        if (!confirm(`【戰略前期授權警告】\n確定要在臨床二期，將此藥物的專利前期授權給國際原廠大藥廠（如輝瑞 PFE）嗎？\n\n執行後：\n1. 您將立刻獲得救命里程碑授權金 $80,000,000。\n2. 此專案立刻中止。\n3. 您永久放棄該新藥後續上市的一切專利定價與日銷售營收分成。`)) {
            return;
        }

        // 注入里程碑款
        corp.corporateCash += 80000000;
        corp.monthRevenue = (corp.monthRevenue || 0) + 80000000;
        app.log(`【專利早期授權】🤝 ${corp.name} 成功與國際大藥廠完成 Phase II 授權！一次性認列里程碑金 $80,000,000，專案完美交割。`, "text-yellow font-bold");
        
        state.activePipelines.splice(pIdx, 1);
        this.refreshPharmaTabUI(corp);
    },

    // C. 灌注 AI 大數據篩選 (boostPhase3)
    boostPhase3(corpId, pipelineId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.pharmaState) return;

        const state = corp.pharmaState;
        const p = state.activePipelines.find(x => x.id === pipelineId);
        if (!p || p.phase !== 3) return;

        const cost = 30000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost;
            p.successRateBoost = (p.successRateBoost || 0) + 8;
            app.log(`【AI篩選注入】${corp.name} 斥資 $30,000,000 灌注超級電腦與 AI 大數據藥物分子分析！使 Phase III 解盲成功率提升 +8%！`, "text-purple-400 font-bold");
            this.refreshPharmaTabUI(corp);
        } else {
            app.log("【資金不足】灌注 AI 大數據篩選需要 $30M 現金！", "text-red-500");
        }
    },

    // D. CDMO 擴建反應器 (buyReactor)
    buyReactor(corpId, capacity) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.pharmaState) return;

        const state = corp.pharmaState;
        let price = capacity === 2000 ? 40000000 : 150000000;
        let maint = capacity === 2000 ? 20000 : 70000;

        // 第一年減免 20%
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalPrice = isFirstYearSubsidized ? Math.floor(price * 0.8) : price;

        if (corp.corporateCash >= finalPrice) {
            corp.corporateCash -= finalPrice;
            corp.monthExpense = (corp.monthExpense || 0) + finalPrice;
            state.reactors.push({ id: `R-${Date.now()}`, capacity, dailyMaint: maint });
            let subsidyMsg = isFirstYearSubsidized ? ` (享國家政策擴產補貼 20% 減免)` : '';
            app.log(`【反應槽擴充】${corp.name} 斥資 $${app.formatMoney(finalPrice)}${subsidyMsg} 擴增一個 ${capacity.toLocaleString()}L 細胞反應器！代工產能大增。`, "text-green-400");
            this.refreshPharmaTabUI(corp);
        } else {
            app.log(`【資金不足】反應器擴建需要 $${app.formatMoney(finalPrice)} 現金！`, "text-red-500");
        }
    },

    // E. CDMO 品管等級調配 (setQAExpense)
    setQAExpense(corpId, expense) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.pharmaState) return;

        corp.pharmaState.qaExpense = expense;
        const subNames = {
            5000: '🥉 低度品管 ($5,000/日)',
            20000: '🥈 常規品管 ($20,000/日)',
            60000: '🥇 高無瑕品管 ($60,000/日)'
        };
        app.log(`【品管策略調整】${corp.name} 品管日維持費已設定為 [${subNames[expense]}]。`, "text-yellow");
        this.refreshPharmaTabUI(corp);
    },

    // F. 學名藥啟動逆向工程仿製 (startReverseEngineering)
    startReverseEngineering(corpId, drugName) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.pharmaState) return;

        const state = corp.pharmaState;
        
        if (state.activeReverseEngineering) {
            app.log("【仿製限制】研發實驗室正有一項逆向工程進行中，無法重複仿製！", "text-red-500");
            return;
        }

        const cost = 30000000;
        // 第一年減免 20%
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost;
            state.activeReverseEngineering = {
                name: drugName,
                daysLeft: 30,
                cost: finalCost
            };
            let subsidyMsg = isFirstYearSubsidized ? ` (享學名藥逆向仿製補貼 20% 減免)` : '';
            app.log(`【仿製立項】${corp.name} 斥資 $${app.formatMoney(finalCost)}${subsidyMsg} 啟動針對原廠大藥 [${drugName}] 的逆向仿製研發！預計工期為 30 天。`, "text-cyan font-bold");
            this.refreshPharmaTabUI(corp);
        } else {
            app.log(`【資金不足】啟動學名藥逆向工程需要 $${app.formatMoney(finalCost)}。`, "text-red-500");
        }
    },

    // G. 學名藥拉動投標拉桿 (changeTenderDiscount)
    changeTenderDiscount(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.pharmaState) return;

        corp.pharmaState.tenderDiscount = parseInt(value);
        app.log(`【投標折扣調整】學名藥廠 ${corp.name} 將標案折扣率拉桿調整至: ${value}%。折扣率越高，未來中標機率越高，但毛利會被大量稀釋！`, "text-yellow");
        this.refreshPharmaTabUI(corp);
    },

    // H. Medtech 購買裝機 (buyMedtechInstall)
    buyMedtechInstall(corpId, strategy) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.pharmaState) return;

        const state = corp.pharmaState;
        
        if (strategy === 'normal') {
            // 原價銷售模式: 無初期扣款，直接注入 pending
            state.pendingInstalls.push({ id: `INST-${Date.now()}`, strategy, daysLeft: 5 });
            app.log(`【銷售裝機】${corp.name} 與教學醫院簽署了「原價購買達文西手術手臂」合約。機台將於 5 天內送達！預期可認列 +$2,000,000 現金！`, "text-cyan font-bold");
            this.refreshPharmaTabUI(corp);
        } else if (strategy === 'subsidy') {
            // 補貼贈送模式
            let price = 15000000;
            // 第一年減免 20%
            let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
            let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
            let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
            let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
            let finalPrice = isFirstYearSubsidized ? Math.floor(price * 0.8) : price;

            if (corp.corporateCash >= finalPrice) {
                corp.corporateCash -= finalPrice;
                corp.monthExpense = (corp.monthExpense || 0) + finalPrice;
                state.pendingInstalls.push({ id: `INST-${Date.now()}`, strategy, daysLeft: 5 });
                let subsidyMsg = isFirstYearSubsidized ? ` (享生技與醫療產業扶持法案 20% 政策減免)` : '';
                app.log(`【免費贈機補貼】${corp.name} 斥資 $${app.formatMoney(finalPrice)}${subsidyMsg} 補貼，免費將新手術手臂安裝至大型醫院！機台將於 5 天內送達並大幅提升未來每日耗材保護費！`, "text-purple-400 font-bold");
                this.refreshPharmaTabUI(corp);
            } else {
                app.log(`【資金不足】大額贈機補貼需要 $${app.formatMoney(finalPrice)} 的資金儲備！`, "text-red-500");
            }
        }
    },

    // 輔助函式：操作完立刻重新整理 Tab UI
    refreshPharmaTabUI(corp) {
        const contentArea = document.getElementById('ceo-detail-tab-content');
        if (contentArea) {
            const isReadOnly = corp.isPlayerFounded ? false : (corp.playerRole ? false : true);
            this.renderPharmaTab(corp, contentArea, isReadOnly);
        }
        
        // 雙重防護：操作後即時更新公司頂部現金顯示，解決自創設備公司等現金未刷新的顯示 Bug
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl && typeof app !== 'undefined') {
            cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        }

        if (typeof app !== 'undefined' && app.updateUI) {
            app.updateUI();
        }
    },

    // ==========================================
    // 4. 每日營收與臨床 FDA 查廠結算 (Process Revenue)
    // ==========================================
    processRevenue(corp) {
        if (!corp.pharmaState) {
            this.initAssets(corp);
        }
        const state = corp.pharmaState;
        let daysOldForSub = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOldForSub <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let dailyRev = 0;
        let dailyExp = 0;
        let bci = app.state.BCI || 100;

        // --- 新藥研發 (innovator) ---
        if (corp.bizModel === 'innovator') {
            // A. 處理在手臨床進度
            for (let i = state.activePipelines.length - 1; i >= 0; i--) {
                let p = state.activePipelines[i];
                p.daysLeft--;
                if (p.daysLeft <= 0) {
                    // 解盲裁示俄羅斯輪盤
                    let baseSuccess = p.phase === 1 ? 0.85 : (p.phase === 2 ? 0.55 : 0.30);
                    let finalSuccess = baseSuccess + (p.successRateBoost || 0) / 100;
                    
                    // CEO 特質加成
                    if (corp.currentCEO && corp.currentCEO.traits) {
                        const traits = corp.currentCEO.traits;
                        if (traits.includes('visionary')) finalSuccess += 0.15; // 技術狂人
                        if (traits.includes('conservative')) finalSuccess -= 0.20; // 保守派
                    }
                    
                    finalSuccess = Math.min(0.80, Math.max(0.10, finalSuccess));
                    
                    if (Math.random() < finalSuccess) {
                        // 臨床成功
                        if (p.phase < 3) {
                            app.log(`【臨床大成功】🎉 ${corp.name} 的 [臨床第 ${p.phase} 期] 數據達顯著統計學差異！安全性與有效性極佳，順利晉級下一期臨床！`, "text-green-400 font-bold");
                        } else {
                            // Phase 3 成功，取得 FDA 藥證！
                            let name = 'FDA 特用靶向重磅新藥';
                            state.launchedDrugs.push({
                                id: `D-${Date.now()}`,
                                name: name,
                                age: 0,
                                dailyRevBase: 1200000 + Math.random() * 800000
                            });
                            
                            // 股價噴發 3 ~ 5 倍
                            let scale = 3 + Math.floor(Math.random() * 3);
                            corp.price = corp.price * scale;
                            
                            app.log(`【解盲成功取得藥證】🏆 狂賀！${corp.name} 的 Phase III 大規模雙盲測試解盲大功告成！正式獲得 FDA 藥證並全球上市！股價瞬間噴發大漲 ${scale} 倍！`, "text-green-400 font-bold animate-pulse");

                            // 供應鏈 Feedback Loop: 自動外包 50% 產能代工訂單給 CDMO (保瑞或台康)
                            const cdmo = app.state.stocks.find(s => ['6472', '6589'].includes(s.id));
                            if (cdmo && cdmo.pharmaState) {
                                let orderVal = 30000000 + Math.random() * 20000000;
                                cdmo.pharmaState.backlog.push({
                                    id: `B-${Date.now()}`,
                                    clientName: corp.name,
                                    type: 'EUA/FDA 新藥大宗代工委託',
                                    daysLeft: 30,
                                    price: orderVal
                                });
                                app.log(`【供應鏈連動】${corp.name} 取得藥證後，由於無實體生產大廠房，已自動向生技代工龍頭 ${cdmo.name} 簽訂 $${app.formatMoney(orderVal)} 代工長約大單！`, "text-purple-300 font-bold");
                            }
                        }
                    } else {
                        // 臨床失敗
                        if (p.phase === 3) {
                            // 股價雪崩連續跌停
                            corp.price = Math.max(0.1, corp.price * 0.3);
                            app.log(`【💥 解盲慘痛失敗】驚天噩耗！${corp.name} 進行的 Phase III 雙盲解盲在臨床統計上未達顯著療效 (P-value > 0.05)！宣告徹底失敗！數十億研發資金打水漂，股價雪崩重挫 70%！`, "text-red-500 font-bold animate-pulse");
                        } else {
                            app.log(`【臨床失敗】${corp.name} 進行的第 ${p.phase} 期臨床安全性或效力數據未達及格線，宣告中止。`, "text-red-500 font-bold");
                        }
                    }
                    
                    state.activePipelines.splice(i, 1);
                    this.refreshPharmaTabUI(corp);
                }
            }

            // B. 結算上市藥物日授權分成
            state.launchedDrugs.forEach(d => {
                d.age++;
                let ageDecay = Math.max(0.1, 1 - (d.age / 3650)); // 10年專利過期衰竭
                let currentDaily = d.dailyRevBase * ageDecay * (bci / 100);
                dailyRev += currentDaily;
                dailyExp += currentDaily * 0.15; // 專利維護費與業務外包分成 15%
            });

            // 自創或上市初期政策性日常折舊費用打 5 折
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
            }
        }
        
        // --- 生技代工 (cdmo) ---
        else if (corp.bizModel === 'cdmo') {
            // A. 計算基礎反應器日常折舊維持費
            state.reactors.forEach(r => {
                dailyExp += r.dailyMaint;
            });
            dailyExp += state.qaExpense; // 每日品管費

            // B. 處理 FDA 停工整改倒數
            if (state.fda整改剩餘天數 > 0) {
                state.fda整改剩餘天數--;
                dailyRev = 0; // 停工期間，全廠代工訂單日營收強行歸零！
            } else {
                // 常規承接代工日營收 (受細胞槽產能與 BCI 熱度支配)
                let totalCapacity = state.reactors.reduce((a,b) => a + b.capacity, 0);
                let passiveUtil = Math.min(1.0, Math.max(0.3, bci / 100)); // 利用率 30% ~ 100%
                let passiveRev = totalCapacity * 12 * passiveUtil; // 產能利用率收益
                
                // 品管加成 (QA/QC 通過吸引國際大廠轉單)
                if (state.qaExpense >= 60000) passiveRev *= 1.20; 
                dailyRev += passiveRev;

                // C. 消化 backlog 合約大單
                let totalReactorCapacity = totalCapacity;
                let activeCount = 0;
                
                for (let i = state.backlog.length - 1; i >= 0; i--) {
                    let b = state.backlog[i];
                    
                    // 單筆合約消耗 1000L 產能量
                    if (totalReactorCapacity >= 1000) {
                        totalReactorCapacity -= 1000;
                        b.daysLeft--;
                        if (b.daysLeft <= 0) {
                            dailyRev += b.price;
                            dailyExp += b.price * 0.40; // 40% 工料與細胞培養基材料成本
                            app.log(`【CDMO代工交貨】生技代工廠 ${corp.name} 順利完成 ${b.clientName} 委託之 [${b.type}] 生物製備！一次性認列合約營收 $${app.formatMoney(b.price)}！`, "text-green-400 font-bold");
                            state.backlog.splice(i, 1);
                        }
                    }
                }
            }

            // 雙軌政策保護：自創或上市初期 CDMO 公司營運費用減半
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
            }

            // D. 每日 0.02% (極低機率) 觸發突擊查廠監管危機 (背景被動)
            if (corp.isPlayerFounded && Math.random() < 0.002 && state.fda整改剩餘天數 === 0) {
                this.triggerFdaInspection(corp);
            }
        }
        
        // --- 學名藥與特藥 (generics) ---
        else if (corp.bizModel === 'generics') {
            // 基礎日常營運行政與折舊
            dailyExp += 15000;

            // A. 處理在手仿製藥逆向工程進度
            if (state.activeReverseEngineering) {
                state.activeReverseEngineering.daysLeft--;
                if (state.activeReverseEngineering.daysLeft <= 0) {
                    let drugName = state.activeReverseEngineering.name;
                    state.unlockedGenerics.push({ name: drugName, originPrice: 350 });
                    app.log(`【逆向仿製成功】🔬 ${corp.name} 的研發部順利解密並仿製成功學名藥 [${drugName}]！即刻解鎖取得全台/全球醫院標案之投標資格！`, "text-cyan font-bold");
                    state.activeReverseEngineering = null;
                    this.refreshPharmaTabUI(corp);
                }
            }

            // B. 消化進行中的醫院招標合約大單
            for (let i = state.hospitalTenders.length - 1; i >= 0; i--) {
                let t = state.hospitalTenders[i];
                t.daysLeft--;
                dailyRev += t.dailyRev;
                dailyExp += t.dailyCost;
                
                if (t.daysLeft <= 0) {
                    app.log(`【醫院標案合約到期】${corp.name} 對於 [${t.name}] 的醫院供貨期限已屆滿，合約停止。`, "text-yellow");
                    state.hospitalTenders.splice(i, 1);
                }
            }

            // 雙軌政策保護：自創或上市初期學名藥公司營運費用減半，並享有每日 $15,000 國家採購特許日營收！
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 15000; // 特許日營收補貼
            }

            // C. 學名藥投標機會判定 (每日 1% 隨機投標通知)
            if (corp.isPlayerFounded && Math.random() < 0.01 && state.unlockedGenerics.length > 0) {
                this.triggerHospitalTenderProcess(corp);
            }
        }
        
        // --- 高階醫材與綜合保健 (medtech) ---
        else if (corp.bizModel === 'medtech') {
            // 基礎行政與物流成本
            dailyExp += 10000 + state.installedBase * 300; 

            // A. 處理在手排程裝機合約
            for (let i = state.pendingInstalls.length - 1; i >= 0; i--) {
                let p = state.pendingInstalls[i];
                p.daysLeft--;
                if (p.daysLeft <= 0) {
                    state.installedBase++;
                    if (p.strategy === 'normal') {
                        dailyRev += 2000000; // 一次性認列高額機台銷貨金
                        app.log(`【高階醫材運裝完成】JNJ 成功向教學醫院交付並安裝手術手臂！一次性獲利認列 $2,000,000 手術車款！當前全台裝機覆蓋率：${state.installedBase} 台！`, "text-green-400 font-bold");
                    } else {
                        // 免費送機大補貼，無現金入帳，但裝機覆蓋已完成
                        app.log(`【補貼贈機裝機完成】JNJ 免費贈機的達文西手術手臂已在各大醫院完成裝機校正！當前全台裝機覆蓋率：${state.installedBase} 台！(每日被動耗材保護費再次擴張！)`, "text-purple-400 font-bold");
                    }
                    state.pendingInstalls.splice(i, 1);
                    this.refreshPharmaTabUI(corp);
                }
            }

            // B. 躺收高毛利拋棄式手術刀片與試劑長尾被動日營收 (每台裝機每日貢獻 $1500 保護費，毛利 80%)
            let consumablesRev = state.installedBase * 1500 * (bci / 100);
            dailyRev += consumablesRev;
            dailyExp += consumablesRev * 0.20; // 耗材製造成本

            // 雙軌政策保護：自創或上市初期醫材公司營運費用減半，並享有每日 $20,000 國家特許日營收！
            if (isFirstYearSubsidized) {
                dailyExp = Math.floor(dailyExp * 0.5);
                dailyRev += 20000; // 特許日營收補貼
            }
        }

        // 全域 NaN 安全限幅與防禦過濾
        if (isNaN(dailyRev) || dailyRev === undefined || dailyRev < 0) dailyRev = 0;
        if (isNaN(dailyExp) || dailyExp === undefined || dailyExp < 0) dailyExp = 0;

        // 全域現金更新與月報表計入
        corp.corporateCash = Number(corp.corporateCash || 0) + dailyRev - dailyExp;
        if (isNaN(corp.corporateCash) || corp.corporateCash < 0) corp.corporateCash = 0;
        corp.monthRevenue = Number(corp.monthRevenue || 0) + dailyRev;
        corp.monthExpense = Number(corp.monthExpense || 0) + dailyExp;
        corp.lastDailyRev = dailyRev;
        corp.lastDailyExp = dailyExp;
    },

    // ==========================================
    // 5. 突發監管危機與政策事件觸發 (FDA Inspection / Bidding)
    // ==========================================
    
    // A. FDA 突擊查廠危機
    triggerFdaInspection(corp) {
        const state = corp.pharmaState;
        
        let baseSuccess = state.qaExpense >= 60000 ? 0.98 : (state.qaExpense >= 20000 ? 0.75 : 0.30);
        let rand = Math.random();
        
        if (rand < baseSuccess) {
            // 查廠順利高分通過！
            app.log(`【🏆 FDA 查廠高分通過】ASML 與大廠紛紛轉單！FDA 官員無預警對 ${corp.name} 進行突擊查廠，受惠於日常高規格品管，全廠防線完美通過無任何缺失紀錄！獲得國際大廠高度肯定！`, "text-green-400 font-bold animate-pulse");
            // 給予 90 天 1.2 倍日營收加成
            state.bciDailyEffect = 1.2;
        } else {
            // 收到 483 缺失信警告，全面勒令停工 90 天！
            state.fda整改剩餘天數 = 90;
            corp.price = Math.max(0.1, corp.price * 0.7); // 股價大跌 30%
            app.log(`【🚫 FDA 483警告信查廠落敗】極端監管危機！FDA 官員於 ${corp.name} 製造槽內檢驗出未達標微粒，判定品管失靈並正式發出「FDA 483 警告信」！勒令全廠立即停工整改 90 天 (停工期間代工營收強行歸零)！公司股價面臨連日重挫跌停！`, "text-red-500 font-bold animate-pulse");
        }
        
        this.refreshPharmaTabUI(corp);
    },

    // B. 學名藥醫院投標事件
    triggerHospitalTenderProcess(corp) {
        const state = corp.pharmaState;
        
        // 隨機抽選一項已逆向開發成功的學名藥進行投標
        let randIdx = Math.floor(Math.random() * state.unlockedGenerics.length);
        let drug = state.unlockedGenerics[randIdx];

        // 投標機率由折扣率 TenderDiscount 控制 (TenderDiscount 越高，折扣越高，報價越低，中標機率越高)
        let successChance = state.tenderDiscount / 100 * 0.95; // 最高 90% 中標率
        
        let tenderName = `${drug.name} 健保招標採購案`;

        if (Math.random() < successChance) {
            // 中標成功！
            // 中標日營收 = 原始原廠日銷額 * (100 - 折扣率)%
            let discountFactor = (100 - state.tenderDiscount) / 100;
            let dailyRev = Math.floor(350000 * discountFactor);
            
            // 由於流血折扣，若生產成本過高，折扣過大可能會造成負毛利
            // 基礎生產費用為 50,000 美金
            let dailyCost = 50000; 

            state.hospitalTenders.push({
                id: `T-${Date.now()}`,
                name: tenderName,
                dailyRev: dailyRev,
                dailyCost: dailyCost,
                daysLeft: 90 // 供貨 90 天
            });

            let profitColor = dailyRev >= dailyCost ? 'text-green-400 font-bold' : 'text-red-400 font-bold animate-pulse';
            app.log(`【🏥 醫院投標大成功】${corp.name} 成功中標 [${tenderName}]！投標折扣為打 ${( (100 - state.tenderDiscount)/10 ).toFixed(1)} 折。每日供貨營收 +$${app.formatMoney(dailyRev)}，每日成本 -$${app.formatMoney(dailyCost)} (毛利狀態: <span class="${profitColor}">$${app.formatMoney(dailyRev - dailyCost)}</span>)！持續供貨 90 天！`, "text-yellow font-bold animate-pulse");
        } else {
            app.log(`【醫院標案流標】學名藥廠 ${corp.name} 對於 [${tenderName}] 的競標中，因報價不具備價格優勢宣告流標！`, "text-gray-400");
        }
        
        this.refreshPharmaTabUI(corp);
    }
};

window.CEO_PHARMA = CEO_PHARMA;
