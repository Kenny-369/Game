// ceo_semi.js - 半導體與設備材料產業（七大子模型）核心模擬子系統
const CEO_SEMI = {
    // ==========================================
    // 1. 初始化資產 (Init Assets)
    // ==========================================
    initAssets(corp) {
        if (!corp.semiState) {
            corp.semiState = {
                // 通用
                cashFlowPool: 0,
                // Foundry & IDM
                fabs: [],
                euvCount: 0,
                processNode: '28nm',
                yieldRate: 0.95,
                // IDM 專屬
                idmAllocation: 0.7, // 70% 自用
                // Design (Fabless)
                activeProjects: [],
                launchedProducts: [],
                // 設備材料與服務 (7大子模型)
                subModel: 'generic', // 'lithography', 'facility', 'wafer', 'substrate', 'osat', 'process_equip', 'design_service'
                backlog: [],
                nextGenTech: 0
            };
        }
        
        const state = corp.semiState;
        const p = corp.price || corp.basePrice || 100;
        const scale = Math.max(1, Math.floor((p * corp.totalShares) / 100000000)) || 1;

        // 核心修正：將創意(3443)、世芯(3661)強制重塑為設計服務服務商
        if (corp.id === '3443' || corp.id === '3661') {
            corp.bizModel = 'design_service'; 
        }

        // 玩家創立之公司為空殼公司，不給予初始資源 (依據 user_rules)
        // 設備與材料初始設為 'generic' 等待進入核心經營二次細分選擇
        if (corp.isPlayerFounded) {
            if (corp.bizModel === 'equipment') {
                // 如果是玩家剛創立的，且還沒選定 subModel，設為 generic
                if (!state.subModel || state.subModel === 'generic') {
                    state.subModel = 'generic';
                }
            } else if (corp.bizModel === 'design_service') {
                state.subModel = 'design_service';
            }
            return; 
        }

        // ==========================================
        // 非玩家（上市公司）根據規模給予初始航線與資源
        // ==========================================
        if (corp.bizModel === 'foundry' || corp.bizModel === 'idm') {
            if (corp.id === '2330') { // 台積電
                state.processNode = '3nm'; state.yieldRate = 0.98; state.euvCount = 8;
                state.fabs = [
                    { id: `F-${Date.now()}-1`, type: 'fab12', capacity: 2000, dailyMaint: 180000 }, 
                    { id: `F-${Date.now()}-2`, type: 'fab12', capacity: 2000, dailyMaint: 180000 }, 
                    { id: `F-${Date.now()}-3`, type: 'fab12', capacity: 2000, dailyMaint: 180000 }
                ];
            } else if (corp.id === 'INTC') { // Intel
                state.processNode = '5nm'; state.yieldRate = 0.92; state.euvCount = 4;
                state.fabs = [
                    { id: `F-${Date.now()}-1`, type: 'fab12', capacity: 2000, dailyMaint: 180000 }, 
                    { id: `F-${Date.now()}-2`, type: 'fab12', capacity: 2000, dailyMaint: 180000 }
                ];
            } else if (corp.id === '2303') { // 聯電
                state.processNode = '7nm'; state.yieldRate = 0.96; state.euvCount = 1;
                state.fabs = [
                    { id: `F-${Date.now()}-1`, type: 'fab12', capacity: 2000, dailyMaint: 180000 }, 
                    { id: `F-${Date.now()}-2`, type: 'fab8', capacity: 500, dailyMaint: 50000 }
                ];
            } else { // 其它代工廠 (力積電、世界先進)
                state.processNode = scale >= 5 ? '7nm' : (scale >= 2 ? '16nm' : '28nm');
                state.euvCount = scale >= 5 ? 2 : (scale >= 2 ? 1 : 0);
                state.fabs.push(scale >= 3 ? { id: `F-${Date.now()}-1`, type: 'fab12', capacity: 2000, dailyMaint: 180000 } : { id: `F-${Date.now()}-1`, type: 'fab8', capacity: 500, dailyMaint: 50000 });
            }
        } 
        
        else if (corp.bizModel === 'design') { // IC 設計 (Fabless)
            if (corp.id === 'NVDA' || corp.id === '2454' || corp.id === 'AMD') {
                state.launchedProducts.push({ id: `P-${Date.now()}`, name: '高階 AI 加速運算晶片', type: 'ai', marketShare: 0.8, dailyRevBase: 1800000, age: 0 });
            } else {
                state.launchedProducts.push({ id: `P-${Date.now()}`, name: '標準消費級晶片 SoC', type: 'mobile', marketShare: 0.3, dailyRevBase: 400000, age: 0 });
            }
        } 
        
        else if (corp.bizModel === 'equipment') {
            // ASML (曝光機)
            if (corp.id === 'ASML') {
                state.subModel = 'lithography';
                state.nextGenTech = 35;
                state.backlog.push({ id: `B-1`, clientName: '台積電', type: 'EUV曝光機', daysLeft: 8, price: 150000000 });
                state.backlog.push({ id: `B-2`, clientName: 'Intel', type: 'EUV曝光機', daysLeft: 18, price: 150000000 });
            } 
            // 漢唐 (無塵室廠務)
            else if (corp.id === '2404') {
                state.subModel = 'facility';
                state.constructionCapacity = 3;
                state.constructionCostEfficiency = 1.0;
                state.backlog.push({ id: `B-1`, clientName: '台積電', type: '竹科先進廠房無塵室', daysLeft: 12, price: 50000000 });
                state.backlog.push({ id: `B-2`, clientName: '力積電', type: '銅鑼成熟廠房工程', daysLeft: 22, price: 30000000 });
            } 
            // 環球晶 (矽晶圓)
            else if (corp.id === '6488') {
                state.subModel = 'wafer';
                state.waferCapacity = scale * 1000 + 1000;
                state.waferPrice = 320; // 矽晶圓單價 (美元/片)
                state.purityLevel = 9.9; // 純度 9N
            } 
            // 欣興 (IC載板)
            else if (corp.id === '3037') {
                state.subModel = 'substrate';
                state.substrateCapacity = scale * 800 + 800;
                state.substratePrice = 90; // ABF 載板單價
                state.advancedLayerTech = 12; // 載板高層數線寬技術等級 (12層)
            } 
            // 日月光投控 (先進封測)
            else if (corp.id === '3711' || corp.id === '2311') {
                state.subModel = 'osat';
                state.pkgCapacity = scale * 3000 + 3000;
                state.cowosCapacity = scale * 150 + 150; // 先進封裝 (CoWoS) 產能
                state.pkgYield = 0.99;
                state.cowosYield = 0.90;
            } 
            // 弘塑/辛耘/萬潤 (製程與後段特用設備)
            else if (['6187', '3583', '3131'].includes(corp.id)) {
                state.subModel = 'process_equip';
                state.precisionLevel = 1.0;
                state.backlog.push({ id: `B-1`, clientName: '聯電', type: '高溫濕製程清洗機', daysLeft: 15, price: 25000000 });
            } 
            // 備用
            else {
                state.subModel = 'process_equip';
                state.precisionLevel = 1.0;
                state.backlog.push({ id: `B-${Date.now()}`, clientName: '晶圓大廠', type: '半導體精密客製設備', daysLeft: 15, price: 20000000 });
            }
        } 
        
        else if (corp.bizModel === 'design_service') { // 創意、世芯-KY (IP與設計服務)
            state.subModel = 'design_service';
            state.teamCount = scale >= 5 ? 5 : (scale >= 2 ? 3 : 2);
            state.backlog.push({ id: `B-1`, clientName: '美商系統大廠', type: '3nm AI ASIC 委託設計案(NRE)', daysLeft: 20, price: 80000000 });
            state.backlog.push({ id: `B-2`, clientName: '日商車用大廠', type: '7nm 車載處理器設計案', daysLeft: 40, price: 40000000 });
            
            // 初始 Royalty 案源池
            state.royaltyPool = [
                { id: `R-1`, name: '高階網通晶片量產案', dailyWaferRun: 80, royaltyPerWafer: 150 }
            ];
        }
    },

    // ==========================================
    // 2. UI 渲染派發 (Render)
    // ==========================================
    renderSemiTab(corp, contentArea, isReadOnly) {
        if (!corp.semiState) this.initAssets(corp);
        let html = `<div class="p-4 bg-black border border-gray-800 rounded crt">`;
        
        let sci = app.state.SCI || 100;
        let sciColor = sci >= 100 ? 'text-green-400 font-bold' : 'text-red-400 font-bold';
        html += `<div class="mb-4 text-xs text-gray-300 bg-gray-900 bg-opacity-80 p-3 rounded border border-gray-800 flex justify-between items-center shadow-[inset_0_0_10px_rgba(0,255,0,0.05)]">
            <div>📊 全球半導體週期指數 (SCI): <span class="${sciColor}">${sci.toFixed(1)}%</span></div>
            <div class="text-xs text-gray-400">※ 影響產能利用率、晶圓價格、封測產量與材料拉貨強度</div>
        </div>`;

        // 計算公司成立天數，判斷是否為玩家創立且在第一年政策補貼期內 (晶片法案護航機制)
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        if (isFirstYearSubsidized) {
            html += `<div class="mb-4 text-xs bg-green-950 bg-opacity-30 p-3 rounded border border-green-700 text-green-400 flex flex-col gap-1 shadow-[0_0_15px_rgba(0,255,0,0.1)] animate-pulse">
                <div class="font-bold flex items-center gap-1.5">🟢 國家晶片扶持法案生效中 (上市/創立前三個月特別護航)</div>
                <div class="text-xs text-gray-300">※ 享有：日常人事與營運折舊成本減免 50% 補貼。</div>
                ${(corp.semiState && ['wafer', 'substrate', 'osat'].includes(corp.semiState.subModel)) ? `<div class="text-xs text-yellow-500 font-bold">※ 特許補貼：因前期市場產能量低，國家每日特許撥發保證收購金，維持基本產線營運！</div>` : ''}
            </div>`;
        }

        // 【二次細分選擇】若玩家創立的設備材料廠尚未選定子模型，則渲染二次選擇面板
        if (corp.bizModel === 'equipment' && corp.semiState.subModel === 'generic') {
            html += this.renderSecondarySelectionUI(corp);
            html += `</div>`;
            contentArea.innerHTML = html;
            return;
        }

        // 根據 business model 進行 UI 分流
        if (corp.bizModel === 'design') {
            html += this.renderFablessUI(corp, isReadOnly);
        } else if (corp.bizModel === 'foundry') {
            html += this.renderFoundryUI(corp, isReadOnly);
        } else if (corp.bizModel === 'idm') {
            html += this.renderIDMUI(corp, isReadOnly);
        } else if (corp.bizModel === 'design_service') {
            html += this.renderDesignServiceUI(corp, isReadOnly);
        } else if (corp.bizModel === 'equipment') {
            const sub = corp.semiState.subModel;
            if (sub === 'lithography') html += this.renderLithographyUI(corp, isReadOnly);
            else if (sub === 'facility') html += this.renderFacilityUI(corp, isReadOnly);
            else if (sub === 'wafer') html += this.renderWaferUI(corp, isReadOnly);
            else if (sub === 'substrate') html += this.renderSubstrateUI(corp, isReadOnly);
            else if (sub === 'osat') html += this.renderOSATUI(corp, isReadOnly);
            else if (sub === 'process_equip') html += this.renderProcessEquipUI(corp, isReadOnly);
            else html += this.renderProcessEquipUI(corp, isReadOnly);
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // ==========================================
    // 2-選擇. 設備材料次產業「二次細分選擇」UI 面板
    // ==========================================
    renderSecondarySelectionUI(corp) {
        let html = `<div class="p-2">
            <h3 class="text-yellow-400 font-bold text-md mb-1 flex items-center gap-1.5">⚡ 半導體設備、材料與封測子板塊轉型選擇</h3>
            <p class="text-xs text-gray-300 mb-4">您的設備材料公司目前為空的「基礎經營大類」。請在下方選擇一個具體的子板塊方向定調轉型。選擇後將自動撥發起步資產並解鎖專屬經營系統！</p>
            
            <div class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                <!-- 1. 曝光機 -->
                <div class="bg-gray-950 p-2.5 rounded border border-purple-900 border-opacity-40 hover:bg-gray-900 transition flex justify-between items-center">
                    <div class="w-3/4">
                        <span class="text-purple-400 font-bold text-xs">🔬 尖端微影曝光設備 (ASML型)</span>
                        <div class="text-xs text-gray-400 mt-1">商業模式: 承接 Foundry EUV 機台排隊訂單，交期竣工認列大額營收，並投資 High-NA 曝光專利達成市場絕對定價權。</div>
                    </div>
                    <button onclick="CEO_SEMI.selectSubModel('${corp.id}', 'lithography')" class="btn-retro text-xs py-1 border-purple-500 text-purple-400 font-bold px-3 hover:bg-purple-950 transition">選擇此項</button>
                </div>

                <!-- 2. 廠務工程 -->
                <div class="bg-gray-950 p-2.5 rounded border border-yellow-800 border-opacity-40 hover:bg-gray-900 transition flex justify-between items-center">
                    <div class="w-3/4">
                        <span class="text-yellow-500 font-bold text-xs">🏗️ 無塵室建廠與機電廠務 (漢唐型)</span>
                        <div class="text-xs text-gray-400 mt-1">商業模式: 承接大廠建廠包案，合約總價極高。當市場任何 Foundry/IDM 新增晶圓廠房時，工程合約會自動外包給您。</div>
                    </div>
                    <button onclick="CEO_SEMI.selectSubModel('${corp.id}', 'facility')" class="btn-retro text-xs py-1 border-yellow-500 text-yellow-500 font-bold px-3 hover:bg-yellow-950 transition">選擇此項</button>
                </div>

                <!-- 3. 矽晶圓 -->
                <div class="bg-gray-950 p-2.5 rounded border border-cyan-900 border-opacity-40 hover:bg-gray-900 transition flex justify-between items-center">
                    <div class="w-3/4">
                        <span class="text-cyan font-bold text-xs">🔮 矽晶圓基礎材料 (環球晶型)</span>
                        <div class="text-xs text-gray-400 mt-1">商業模式: 依靠物理拉晶爐每日出貨。下游晶圓代工廠每生產一片晶圓所消耗材料費的 50% 自動轉為您的日營收。</div>
                    </div>
                    <button onclick="CEO_SEMI.selectSubModel('${corp.id}', 'wafer')" class="btn-retro text-xs py-1 border-cyan text-cyan font-bold px-3 hover:bg-cyan-950 transition">選擇此項</button>
                </div>

                <!-- 4. IC載板 -->
                <div class="bg-gray-950 p-2.5 rounded border border-magenta border-opacity-40 hover:bg-gray-900 transition flex justify-between items-center">
                    <div class="w-3/4">
                        <span class="text-magenta font-bold text-xs">🎴 IC 載板與 PCB 電路板 (欣興型)</span>
                        <div class="text-xs text-gray-400 mt-1">商業模式: 提供高級 ABF 載板，日營收與下游 Fabless 設計大廠（NVIDIA等）的手機/AI晶片銷量直接強連動。</div>
                    </div>
                    <button onclick="CEO_SEMI.selectSubModel('${corp.id}', 'substrate')" class="btn-retro text-xs py-1 border-magenta text-magenta font-bold px-3 hover:bg-magenta hover:text-white transition">選擇此項</button>
                </div>

                <!-- 5. 先進封測 -->
                <div class="bg-gray-950 p-2.5 rounded border border-green-900 border-opacity-40 hover:bg-gray-900 transition flex justify-between items-center">
                    <div class="w-3/4">
                        <span class="text-green-400 font-bold text-xs">📦 後段先進封裝與測試 (日月光型)</span>
                        <div class="text-xs text-gray-400 mt-1">商業模式: 分為傳統封測與高利潤 CoWoS 先進封裝。設計大廠晶片銷售代工費中的 15% 會作為封裝費自動分潤給您！</div>
                    </div>
                    <button onclick="CEO_SEMI.selectSubModel('${corp.id}', 'osat')" class="btn-retro text-xs py-1 border-green-500 text-green-400 font-bold px-3 hover:bg-green-950 transition">選擇此項</button>
                </div>

                <!-- 6. 製程特用設備 -->
                <div class="bg-gray-950 p-2.5 rounded border border-blue-900 border-opacity-40 hover:bg-gray-900 transition flex justify-between items-center">
                    <div class="w-3/4">
                        <span class="text-blue-400 font-bold text-xs">⚙️ 製程與後段精密特用設備 (弘塑/辛耘型)</span>
                        <div class="text-xs text-gray-400 mt-1">商業模式: 承接清洗、點膠等製程機台 Backlog，代工廠建新廠或購入 EUV 時會自動向您下單精密機台。</div>
                    </div>
                    <button onclick="CEO_SEMI.selectSubModel('${corp.id}', 'process_equip')" class="btn-retro text-xs py-1 border-blue-400 text-blue-400 font-bold px-3 hover:bg-blue-950 transition">選擇此項</button>
                </div>

                <!-- 7. IP設計服務 -->
                <div class="bg-gray-950 p-2.5 rounded border border-cyan-800 border-opacity-40 hover:bg-gray-900 transition flex justify-between items-center">
                    <div class="w-3/4">
                        <span class="text-cyan font-bold text-xs">🧠 IP 授權與 ASIC 設計服務 (創意/世芯型)</span>
                        <div class="text-xs text-gray-400 mt-1">商業模式: **無任何流片失敗與跌價虧損風險！** 承包委託設計 (NRE 營收)，並在晶圓量產投片時，每日抽取高毛利 Royalty 分潤。</div>
                    </div>
                    <button onclick="CEO_SEMI.selectSubModel('${corp.id}', 'design_service')" class="btn-retro text-xs py-1 border-cyan text-cyan font-bold px-3 hover:bg-cyan-950 transition">選擇此項</button>
                </div>
            </div>
        </div>`;
        return html;
    },

    // ==========================================
    // 2-選擇-執行. 二次細分轉型選擇核心邏輯
    // ==========================================
    selectSubModel(corpId, subModel) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.semiState) return;

        const state = corp.semiState;
        state.subModel = subModel;

        // 若轉型為設計服務，則將主 bizModel 重塑，以利結算引擎對流
        if (subModel === 'design_service') {
            corp.bizModel = 'design_service';
        }

        // 配發初創空殼公司基本起跑線資產與國家戰略種子合約 (防範初期斷水問題)
        if (subModel === 'lithography') {
            state.nextGenTech = 0;
            state.backlog = [
                { id: 'B-startup', clientName: '國家晶片戰略基金', type: '國家科研院 EUV 實驗機台研發委託案', daysLeft: 25, price: 80000000 }
            ];
        } else if (subModel === 'facility') {
            state.constructionCapacity = 1; // 初始施工隊 1 隊
            state.constructionCostEfficiency = 1.0;
            state.backlog = [
                { id: 'B-startup', clientName: '國家科學園區局', type: '科學園區一期先進廠房無塵室統包案', daysLeft: 20, price: 30000000 }
            ];
        } else if (subModel === 'wafer') {
            state.waferCapacity = 500; // 初始 500 片晶圓產能
            state.waferPrice = 300;
            state.purityLevel = 9.0; // 初始 9N 純度
            state.backlog = [];
        } else if (subModel === 'substrate') {
            state.substrateCapacity = 400; // 初始載板 400 片
            state.substratePrice = 80;
            state.advancedLayerTech = 8; // 初始 8 層板技術
            state.backlog = [];
        } else if (subModel === 'osat') {
            state.pkgCapacity = 1000; // 傳統封裝日產能 1000
            state.cowosCapacity = 0; // 先進封裝初始為 0
            state.pkgYield = 0.98;
            state.cowosYield = 0.85;
            state.backlog = [];
        } else if (subModel === 'process_equip') {
            state.precisionLevel = 1.0;
            state.backlog = [
                { id: 'B-startup', clientName: '國家微電子中心', type: '國家晶圓廠清洗與點膠機裝機案', daysLeft: 15, price: 15000000 }
            ];
        } else if (subModel === 'design_service') {
            state.teamCount = 1; // 初始設計團隊 1 隊
            state.backlog = [
                { id: 'B-startup', clientName: '國防科研院', type: '國防次世代 AI ASIC 設計服務案', daysLeft: 22, price: 40000000 }
            ];
            state.royaltyPool = [];
        }

        // 打印炫麗的轉型日誌
        const subNames = {
            lithography: '尖端微影曝光設備商 (Lithography)',
            facility: '無塵室建廠與機電廠務工程商 (Facility)',
            wafer: '矽晶圓與基礎材料供應商 (Silicon Wafer)',
            substrate: 'IC 載板與 PCB 電路板製造商 (IC Substrates)',
            osat: '後段先進封裝與測試代工廠 (OSAT)',
            process_equip: '半導體製程與後段精密設備商 (Process Tools)',
            design_service: 'IP 授權與 ASIC 設計服務服務商 (Design Service)'
        };
        app.log(`【子產業轉型定調】🎉 恭喜！您所創辦的 ${corp.name} 順利定調轉型為 [${subNames[subModel]}]！專屬的核心經營面板與起跑線資產已配發解鎖！`, "text-green-400 font-bold animate-pulse");

        this.refreshSemiTabUI(corp);
    },

    // ==========================================
    // 2-A. IC 設計 (Fabless) 面板
    // ==========================================
    renderFablessUI(corp, isReadOnly) {
        const state = corp.semiState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-cyan font-bold mb-2 text-md flex items-center gap-1">⚡ IC 設計 (Fabless) 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">高智力密集、輕資產的高風險賭局。研發完成後必須斥資發動「流片(Tape-out)輪盤」。流片失敗則研發費用打水漂；成功則產品正式商用，迎來高毛利授權金暴利。</p>`;

        // 流片輪盤
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🎰 發動新晶片研發與流片 (Tape-out Roulette)</h4>`;
        if (!isReadOnly) {
            html += `<div class="grid grid-cols-3 gap-2 mb-4">
                <button ${disabledAttr} onclick="CEO_SEMI.startTapeOut('${corp.id}', 'mobile')" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2 rounded border border-cyan border-opacity-40 text-left transition hover:border-cyan">
                    <div class="text-cyan text-xs font-bold">📱 行動 SoC 晶片</div>
                    <div class="text-xs text-gray-400 mt-1">開發成本: $30M | 耗時: 30天</div>
                    <div class="text-xs text-green-400 mt-1">流片成功率: 90%</div>
                </button>
                <button ${disabledAttr} onclick="CEO_SEMI.startTapeOut('${corp.id}', 'auto')" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2 rounded border border-green-700 border-opacity-40 text-left transition hover:border-green-400">
                    <div class="text-green-400 text-xs font-bold">🚗 車用控制晶片</div>
                    <div class="text-xs text-gray-400 mt-1">開發成本: $50M | 耗時: 45天</div>
                    <div class="text-xs text-green-400 mt-1">流片成功率: 70%</div>
                </button>
                <button ${disabledAttr} onclick="CEO_SEMI.startTapeOut('${corp.id}', 'ai')" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2 rounded border border-purple-800 border-opacity-40 text-left transition hover:border-purple-500">
                    <div class="text-purple-400 text-xs font-bold">🧠 先進 AI 運算卡</div>
                    <div class="text-xs text-gray-400 mt-1">開發成本: $150M | 耗時: 90天</div>
                    <div class="text-xs text-yellow-400 mt-1">流片成功率: 40%</div>
                </button>
            </div>`;
        }

        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 mb-6 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.activeProjects.length > 0) {
            state.activeProjects.forEach(p => {
                let typeColor = p.type === 'ai' ? 'text-purple-400' : (p.type === 'auto' ? 'text-green-400' : 'text-cyan');
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-1.5 last:border-0">
                    <div class="${typeColor} font-bold">${p.name} <span class="text-gray-400 text-xs ml-1">(${p.type.toUpperCase()})</span></div>
                    <div class="text-yellow-400 animate-pulse font-mono">流片製程中... 剩餘 ${p.daysLeft} 天</div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有開發進行中的流片專案。</div>`;
        }
        html += `</div>`;

        // 產品線管理
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">📦 已商用產品線與授權金</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.launchedProducts.length > 0) {
            state.launchedProducts.forEach(p => {
                let typeColor = p.type === 'ai' ? 'text-purple-400' : (p.type === 'auto' ? 'text-green-400' : 'text-cyan');
                let decay = Math.max(0.1, 1 - (p.age / 365));
                let currentDaily = p.dailyRevBase * decay * ((app.state.SCI || 100) / 100);
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2 last:border-0">
                    <div>
                        <div class="${typeColor} font-bold">${p.name}</div>
                        <div class="text-xs text-gray-400 mt-0.5">上市: ${p.age}天 | 產品生命週期力: ${(decay*100).toFixed(0)}%</div>
                    </div>
                    <div class="text-green-400 font-mono text-right">
                        <div>日授權營收: $${app.formatMoney(currentDaily)}</div>
                        <div class="text-xs text-gray-400">外包代工與封測費: -$${app.formatMoney(currentDaily * 0.4)}</div>
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前無商用產品，公司無持續性營收來源。</div>`;
        }
        html += `</div>`;

        return html;
    },

    // ==========================================
    // 2-B. 晶圓代工 (Foundry) 面板
    // ==========================================
    renderFoundryUI(corp, isReadOnly) {
        const state = corp.semiState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let utilization = Math.min(100, Math.max(30, Math.floor((app.state.SCI || 100) * 0.9)));
        let utilColor = utilization < 60 ? 'text-red-500 font-bold' : (utilization > 85 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold');

        let html = `<h3 class="text-green-400 font-bold mb-2 text-md">🏭 晶圓代工 (Foundry) 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">重資本支出、固定折舊與晶圓良率的數學戰爭。工廠一旦開建，折舊費即雷打不動；產能利用率一旦低於 60% 將面臨巨額折舊虧損。</p>`;

        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">先進製程節點</div>
                <div class="text-white font-mono font-bold text-lg mt-0.5">${state.processNode}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">晶圓平均良率</div>
                <div class="text-green-400 font-mono font-bold text-lg mt-0.5">${(state.yieldRate*100).toFixed(1)}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">當前產能利用率</div>
                <div class="font-mono text-lg mt-0.5 ${utilColor}">${utilization}%</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🏗️ 晶圓建廠與核心設備採購 (CapEx)</h4>`;
            html += `<div class="mb-4 grid grid-cols-3 gap-2">
                <button ${disabledAttr} onclick="CEO_SEMI.buyFab('${corp.id}', 'fab8')" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2 rounded text-left border border-green-900 border-opacity-40 transition hover:border-green-400">
                    <div class="font-bold text-green-400 text-xs">🏢 成熟 8吋廠</div>
                    <div class="text-gray-400 text-xs mt-0.5">日產能: +500片</div>
                    <div class="text-yellow-400 font-mono text-xs mt-1">造價: $150M</div>
                </button>
                <button ${disabledAttr} onclick="CEO_SEMI.buyFab('${corp.id}', 'fab12')" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2 rounded text-left border border-green-900 border-opacity-40 transition hover:border-green-400">
                    <div class="font-bold text-green-400 text-xs">🏢 先進 12吋廠</div>
                    <div class="text-gray-400 text-xs mt-0.5">日產能: +2000片</div>
                    <div class="text-yellow-400 font-mono text-xs mt-1">造價: $500M</div>
                </button>
                <button ${disabledAttr} onclick="CEO_SEMI.buyEUV('${corp.id}')" class="${disabledClass} bg-gray-900 hover:bg-gray-800 p-2 rounded text-left border border-blue-900 border-opacity-40 transition hover:border-blue-400">
                    <div class="font-bold text-blue-400 text-xs">⚙️ ASML EUV曝光機</div>
                    <div class="text-gray-400 text-xs mt-0.5">良率永久提升 +5%</div>
                    <div class="text-yellow-400 font-mono text-xs mt-1">機台價: $150M</div>
                </button>
            </div>`;

            html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">⚡ 製程研發與良率調校</h4>`;
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-cyan text-xs">【先進製程奈米微縮】</div>
                        <p class="text-xs text-gray-400 mt-1">研發下一代先進製程（如 5nm ➔ 3nm），大幅提升單片晶圓代工單價。製程研發突破時，良率會暫時崩跌。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeNode('${corp.id}')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-cyan text-cyan hover:bg-cyan-955 hover:text-white font-bold transition">
                        發動研發微縮 (-$100M)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">【晶圓良率製程參數優化】</div>
                        <p class="text-xs text-gray-400 mt-1">最佳化晶圓廠生產參數，提升廢片回收與投片良率，減少原料報廢損失費用。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.optimizeYield('${corp.id}')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-green-500 text-green-400 hover:bg-green-955 hover:text-white font-bold transition">
                        發動良率改善 (-$30M)
                    </button>
                </div>
            </div>`;
        }

        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-green-500 pl-1.5">🏭 實體晶圓廠與折舊資產</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded text-xs border border-gray-900 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (state.fabs.length > 0) {
            state.fabs.forEach(f => {
                html += `<div class="flex justify-between border-b border-gray-900 py-1.5 text-gray-300 last:border-0">
                    <span>🏢 ${f.type === 'fab8' ? '成熟 8吋晶圓廠' : '先進 12吋晶圓廠'} <span class="text-gray-400">(日產能 ${f.capacity}片)</span></span>
                    <span class="text-red-400 font-mono">每日折舊: -$${app.formatMoney(f.dailyMaint)}</span>
                </div>`;
            });
            html += `<div class="flex justify-between pt-2 border-t border-gray-900 mt-1.5 font-bold">
                <span>⚙️ EUV 極紫外光刻機總數</span>
                <span class="text-cyan font-mono">${state.euvCount} 台</span>
            </div>`;
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有任何實體晶圓廠房。</div>`;
        }
        html += `</div>`;

        return html;
    },

    // ==========================================
    // 2-C. 整合元件製造 (IDM) 面板
    // ==========================================
    renderIDMUI(corp, isReadOnly) {
        let html = `<h3 class="text-yellow-400 font-bold mb-2 text-md">⚙️ 整合元件製造 (IDM) 決策面板</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">資源分配的終極考驗。同時擁有晶片設計研發與實體工廠，毛利率高但承受研發費用與恐怖折舊的雙重壓迫。</p>`;

        const state = corp.semiState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        
        let selfPct = Math.round(state.idmAllocation * 100);
        let outPct = 100 - selfPct;
        html += `<div class="bg-gray-950 p-3 rounded border border-yellow-700 border-opacity-40 mb-5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
            <h4 class="text-yellow-400 font-bold text-xs mb-1.5">⚖️ 雙軌製造產能調配</h4>
            <div class="text-xs text-gray-400 mb-3">決定自有晶圓廠產能有多少要留給自己生產自家晶片以獲取暴利，有多少要切出去承包別人的代工訂單。</div>
            <div class="flex gap-4 items-center">
                <input type="range" min="0" max="100" step="10" value="${selfPct}" ${disabledAttr}
                       onchange="CEO_SEMI.changeIDMAllocation('${corp.id}', this.value)"
                       oninput="document.getElementById('idm-val-self').innerText = this.value + '%'; document.getElementById('idm-val-out').innerText = (100 - this.value) + '%';"
                       class="w-2/3 cursor-pointer accent-yellow-400">
                <div class="text-xs text-gray-300 font-mono">
                     <div>自用晶片: <span id="idm-val-self" class="text-cyan font-bold">${selfPct}%</span></div>
                     <div>接單代工: <span id="idm-val-out" class="text-yellow font Red-bold">${outPct}%</span></div>
                </div>
            </div>
        </div>`;

        // 下半部共用 Foundry
        html += this.renderFoundryUI(corp, isReadOnly).replace('<h3 class="text-green-400 font-bold mb-2 text-md">🏭 晶圓代工 (Foundry) 決策面板</h3>', '').replace('<p class="text-xs text-gray-300 mb-4">重資本支出、固定折舊與晶圓良率的數學戰爭。工廠一旦開建，折舊費即雷打不動；產能利用率一旦低於 60% 將面臨巨額折舊虧損。</p>', '');
        return html;
    },

    // ==========================================
    // 2-D-1. 微影曝光設備 (Lithography) [ASML]
    // ==========================================
    renderLithographyUI(corp, isReadOnly) {
        const state = corp.semiState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';
        let hasMonopoly = state.nextGenTech >= 100;

        let html = `<h3 class="text-purple-400 font-bold mb-2 text-md">🔬 尖端微影曝光設備 (Lithography) - ASML</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">掌握半導體物理製程天花板的極紫外光曝光機 (EUV)。下游 Foundry 建廠與升級時必備的機台，一旦研發並壟斷 High-NA 技術，定價權將為您所有！</p>`;

        html += `<div class="grid grid-cols-2 gap-3 mb-5">
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">次世代 High-NA EUV 研發</div>
                <div class="text-purple-400 font-bold text-sm mt-0.5">${hasMonopoly ? '👑 絕對市場壟斷' : `${state.nextGenTech.toFixed(1)}%`}</div>
            </div>
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">EUV 機台合約單價</div>
                <div class="text-green-400 font-mono font-bold text-sm mt-0.5">$${hasMonopoly ? '250,000,000' : '150,000,000'}</div>
            </div>
        </div>`;

        if (!isReadOnly && !hasMonopoly) {
            html += `<div class="mb-5 bg-gray-950 p-3 rounded border border-purple-900 border-opacity-40 flex justify-between items-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div>
                    <div class="text-white text-xs font-bold">🧬 研發次世代 High-NA 曝光技術</div>
                    <div class="text-xs text-gray-400 mt-0.5">研發進度達 100% 後將達成絕對壟斷，每台機台合約價將從 $150M 擺脫至 $250M！</div>
                </div>
                <button ${disabledAttr} onclick="CEO_SEMI.upgradeTech('${corp.id}', 'lithography')" class="${disabledClass} btn-retro px-3 py-1.5 text-xs border-purple-500 text-purple-400 hover:bg-purple-950 transition font-bold">
                    投資研案 (-$100M)
                </button>
            </div>`;
        }

        html += this.renderBacklogSection(state.backlog);
        return html;
    },

    // ==========================================
    // 2-D-2. 無塵室建廠工程 (Cleanroom) [漢唐]
    // ==========================================
    renderFacilityUI(corp, isReadOnly) {
        const state = corp.semiState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-yellow-500 font-bold mb-2 text-md">🏗️ 無塵室建廠與機電廠務 (Facility) - 漢唐</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">半導體建廠的基石。當市場上有任何 Foundry 新增晶圓廠房時，這筆數億美元龐大資本支出的 10% ~ 15% 會自動轉化為您的無塵室工程訂單。</p>`;

        html += `<div class="grid grid-cols-2 gap-3 mb-5">
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">最大同時施工隊量能</div>
                <div class="text-yellow-500 font-bold text-sm mt-0.5">${state.constructionCapacity} 隊</div>
            </div>
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">施工成本效率 (工料管理)</div>
                <div class="text-green-400 font-bold text-sm mt-0.5">${((2 - state.constructionCostEfficiency)*100).toFixed(0)}% (利潤增加)</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-yellow-500 text-xs">【引進外部工程包商】</div>
                        <p class="text-xs text-gray-400 mt-1">擴充施工團隊，使能同時消化更多廠房無塵室合約案。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeConstruction('${corp.id}', 'capacity')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-yellow-500 text-yellow-500 hover:bg-yellow-950 font-bold transition">
                        擴建工程隊 (-$30M)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">【工料供應鏈談判】</div>
                        <p class="text-xs text-gray-400 mt-1">優化無塵室不鏽鋼與濾網等工料供應鏈，永久降低工程耗損成本。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeConstruction('${corp.id}', 'efficiency')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-green-500 text-green-400 hover:bg-green-955 font-bold transition">
                        談判工料管理 (-$20M)
                    </button>
                </div>
            </div>`;
        }

        html += this.renderBacklogSection(state.backlog);
        return html;
    },

    // ==========================================
    // 2-D-3. 矽晶圓與物理基礎材料 (Silicon Wafer) [環球晶]
    // ==========================================
    renderWaferUI(corp, isReadOnly) {
        const state = corp.semiState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-cyan font-bold mb-2 text-md">🔮 矽晶圓與物理基礎材料 (Silicon Wafer) - 環球晶</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">晶圓代工必備之基礎消耗材（矽晶棒與矽晶圓）。無 Backlog 交期折損，以消耗量計日營收。下游代工廠（台積電、聯電）生產晶圓所付出的材料支出中，有 50% 會自動轉化為您的被動材料訂單！</p>`;

        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">晶圓拉晶爐產能</div>
                <div class="text-cyan font-mono font-bold text-sm mt-0.5">${state.waferCapacity} 片/日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">高純度材料定價</div>
                <div class="text-green-400 font-mono font-bold text-sm mt-0.5">$${state.waferPrice} /片</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">矽晶圓材料純度</div>
                <div class="text-white font-mono font-bold text-sm mt-0.5">${state.purityLevel}N 矽片</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-cyan text-xs">【擴增矽晶拉晶爐線】</div>
                        <p class="text-xs text-gray-400 mt-1">斥資買入新型拉晶爐，提升公司每日能產出與交付的矽晶圓產能上限。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeWafer('${corp.id}', 'capacity')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-cyan text-cyan hover:bg-cyan-950 font-bold transition">
                        擴建拉晶產能 (+$50M)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">【超高純度提煉研發】</div>
                        <p class="text-xs text-gray-400 mt-1">研發更高N奈米製程用超高純度晶圓材料，提升每片矽晶圓的基礎定價權與毛利。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeWafer('${corp.id}', 'purity')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-green-500 text-green-400 hover:bg-green-950 font-bold transition">
                        研發超高純度 (-$30M)
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-D-4. IC 載板與印刷電路板 (IC Substrates) [欣興]
    // ==========================================
    renderSubstrateUI(corp, isReadOnly) {
        const state = corp.semiState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-magenta font-bold mb-2 text-md">🎴 IC 載板與印刷電路板 (IC Substrates & PCB) - 欣興</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">高端 ABF / BT 載板是高階晶片不可或缺的外部電路連接介底。獲利與下游先進封裝高度相關。市場上 Fabless 設計巨頭（NVIDIA等）的 AI 產品大賣時，欣興會自動湧入 ABF 載板消耗訂單！</p>`;

        html += `<div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">ABF 載板日產能</div>
                <div class="text-magenta font-mono font-bold text-sm mt-0.5">${state.substrateCapacity} 片/日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">載板單片均價</div>
                <div class="text-green-400 font-mono font-bold text-sm mt-0.5">$${state.substratePrice} /片</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">高層數細線寬技術</div>
                <div class="text-white font-mono font-bold text-sm mt-0.5">${state.advancedLayerTech} 層級</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-magenta text-xs">【擴增 ABF 生產線】</div>
                        <p class="text-xs text-gray-400 mt-1">引進高精密層壓機與電鍍線，擴增公司每日交付的 ABF 載板產能上限。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeSubstrate('${corp.id}', 'capacity')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-magenta text-magenta hover:bg-magenta hover:text-white font-bold transition">
                        擴建載板產能 (+$80M)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">【高層數與細線寬研發】</div>
                        <p class="text-xs text-gray-400 mt-1">研發伺服器/先進封裝用 16 層以上 ABF 載板，大幅度提高出貨均價。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeSubstrate('${corp.id}', 'layer')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-green-500 text-green-400 hover:bg-green-950 font-bold transition">
                        研製高精度載板 (-$50M)
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-D-5. 後段先進封測 (Packaging & Test) [日月光]
    // ==========================================
    renderOSATUI(corp, isReadOnly) {
        const state = corp.semiState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-green-400 font-bold mb-2 text-md">📦 後段先進封裝與測試代工 (OSAT) - 日月光投控</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">半導體後段製程的核心。分成高產量的「傳統封裝」與極高毛利的「先進 CoWoS/Chiplet 2.5D封裝」。所有設計廠產品銷售代工費中的 15%，會直接轉化為您的封測代工分潤。</p>`;

        html += `<div class="grid grid-cols-4 gap-2 mb-5">
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">傳統封裝產能</div>
                <div class="text-white font-mono font-bold text-xs mt-0.5">${state.pkgCapacity} 片/日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">先進CoWoS產能</div>
                <div class="text-cyan font-mono font-bold text-xs mt-0.5">${state.cowosCapacity} 片/日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">傳統封裝良率</div>
                <div class="text-green-400 font-mono font-bold text-xs mt-0.5">${(state.pkgYield*100).toFixed(1)}%</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900 text-center shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">CoWoS 良率</div>
                <div class="text-green-400 font-mono font-bold text-xs mt-0.5">${(state.cowosYield*100).toFixed(1)}%</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-cyan text-xs">【擴置 CoWoS 先進封裝線】</div>
                        <p class="text-xs text-gray-400 mt-1">引進高精密封測對位機台與熱壓設備，開闢並增產高利潤的次世代先進封裝產能。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeOSAT('${corp.id}', 'cowos')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-cyan text-cyan hover:bg-cyan-950 font-bold transition">
                        增建 CoWoS 產線 (+$120M)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">【封裝參數微調優化】</div>
                        <p class="text-xs text-gray-400 mt-1">優化晶片打線與封膠參數，減少把代工廠運來的珍貴裸晶封壞報廢的損失責任。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeOSAT('${corp.id}', 'yield')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-green-500 text-green-400 hover:bg-green-950 font-bold transition">
                        優化封測良率 (-$40M)
                    </button>
                </div>
            </div>`;
        }

        return html;
    },

    // ==========================================
    // 2-D-6. 製程特用設備 (Process Tool) [弘塑/辛耘/萬潤]
    // ==========================================
    renderProcessEquipUI(corp, isReadOnly) {
        const state = corp.semiState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-blue-400 font-bold mb-2 text-md">⚙️ 半導體製程與後段特用設備 (Process Equipment) - ${corp.name}</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">專營濕製程清洗、精密點膠、量測與光學檢測機台。當 Foundry / IDM 公司點擊「購買晶圓廠」或「購入 EUV 曝光機」時，會產生高精度設備合約需求（單筆 $20M ~ $50M），成為您的 Backlog 訂單。</p>`;

        html += `<div class="grid grid-cols-2 gap-3 mb-5">
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">設備定位精度係數</div>
                <div class="text-blue-400 font-mono font-bold text-sm mt-0.5">${state.precisionLevel.toFixed(2)}x 奈米級</div>
            </div>
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">設備合約平均利潤加成</div>
                <div class="text-green-400 font-mono font-bold text-sm mt-0.5">+${((state.precisionLevel - 1)*100).toFixed(0)}%</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-blue-400 text-xs">【升級機台精密精度】</div>
                        <p class="text-xs text-gray-400 mt-1">研發高精度光學定位滑軌，提高機台精細度。永久提高所有未來新訂單機台 contract 的價格。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeProcessEquip('${corp.id}', 'precision')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-blue-400 text-blue-400 hover:bg-blue-955 font-bold transition">
                        精度升級 (-$50M)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">【零組件國產供應管理】</div>
                        <p class="text-xs text-gray-400 mt-1">將部分通用零組件國產化，藉此永久調降製造生產機台時所需的零件固定成本。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeProcessEquip('${corp.id}', 'supply')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-green-500 text-green-400 hover:bg-green-950 font-bold transition">
                        供應鏈優化 (-$20M)
                    </button>
                </div>
            </div>`;
        }

        html += this.renderBacklogSection(state.backlog);
        return html;
    },

    // ==========================================
    // 2-D-7. IP 授權與 ASIC 設計服務 (Design Service) [創意/世芯]
    // ==========================================
    renderDesignServiceUI(corp, isReadOnly) {
        const state = corp.semiState;
        const disabledAttr = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-cyan font-bold mb-2 text-md">🧠 IP 授權與 ASIC 設計服務 (Design Service) - ${corp.name}</h3>`;
        html += `<p class="text-xs text-gray-300 mb-4">**完全不承擔流片失敗風險！** 專幫大型系統廠或AI巨頭將晶片圖面落實到流片投片。收益來源為委託設計費(NRE，完工大額認列)以及客戶量產後的晶圓量產權利金(Royalty)。</p>`;

        html += `<div class="grid grid-cols-2 gap-3 mb-5">
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">ASIC 委託設計團隊數量</div>
                <div class="text-cyan font-bold text-sm mt-0.5">${state.teamCount} 隊 <span class="text-gray-400 text-xs">(最大承接上限)</span></div>
            </div>
            <div class="bg-gray-950 p-2.5 rounded border border-gray-900 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div class="text-gray-400 text-xs">先進封裝 IP 庫資產</div>
                <div class="text-green-400 font-bold text-sm mt-0.5">累計 ${state.nextGenTech >= 100 ? '👑 先進 3D/CoWoS' : '7nm 常規晶片級'}</div>
            </div>
        </div>`;

        if (!isReadOnly) {
            html += `<div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-cyan text-xs">【擴增 ASIC 工程研發團隊】</div>
                        <p class="text-xs text-gray-400 mt-1">招攬高階 SoC 佈線工程師團隊，能同時承載、執行更多 NRE 客製化晶片設計案。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeAsicService('${corp.id}', 'team')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-cyan text-cyan hover:bg-cyan-955 font-bold transition">
                        擴建設計團隊 (+$40M)
                    </button>
                </div>
                <div class="bg-gray-950 p-3 rounded border border-gray-900 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <div>
                        <div class="font-bold text-green-400 text-xs">【研發 3D / CoWoS 封裝 IP 庫】</div>
                        <p class="text-xs text-gray-400 mt-1">投資開發先進封裝高速傳輸 IP 庫，解鎖承接高端 AI 晶片委託案的超高利潤合約。</p>
                    </div>
                    <button ${disabledAttr} onclick="CEO_SEMI.upgradeAsicService('${corp.id}', 'ip')" class="${disabledClass} btn-retro py-1 mt-3 text-xs border-green-500 text-green-400 hover:bg-green-950 font-bold transition">
                        研發先進封裝IP (-$80M)
                    </button>
                </div>
            </div>`;
        }

        // Royalty 產能案源池
        html += `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-cyan pl-1.5">🧮 已進入量產階段晶圓 Royalty 權利金案件</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded text-xs border border-gray-900 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] mb-5">`;
        if (state.royaltyPool.length > 0) {
            state.royaltyPool.forEach(r => {
                let dailyEarn = r.dailyWaferRun * r.royaltyPerWafer;
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-1.5 last:border-0">
                    <div>
                        <span class="text-gray-300 font-bold">${r.name}</span>
                        <div class="text-xs text-gray-400 mt-0.5">每日投片量: ${r.dailyWaferRun} 片 | 單片抽成: $${r.royaltyPerWafer}</div>
                    </div>
                    <span class="text-green-400 font-mono font-bold">每日抽成: +$${app.formatMoney(dailyEarn)}</span>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-2">目前沒有量產專案，無量產抽成營收。</div>`;
        }
        html += `</div>`;

        html += this.renderBacklogSection(state.backlog);
        return html;
    },

    // 共用 Backlog UI 輔助函式
    renderBacklogSection(backlog) {
        let html = `<h4 class="text-white font-bold text-xs mb-2 border-l-2 border-purple-500 pl-1.5">📋 在手排隊委託合約 (Backlog)</h4>`;
        html += `<div class="bg-gray-950 p-2.5 rounded text-xs border border-gray-900 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">`;
        if (backlog.length > 0) {
            backlog.forEach(b => {
                html += `<div class="flex justify-between items-center border-b border-gray-900 py-2 last:border-0">
                    <div>
                        <span class="text-gray-300 font-bold">${b.clientName} 委託合約</span>
                        <span class="text-xs bg-purple-950 text-purple-300 border border-purple-800 px-1 rounded ml-1.5 font-mono">${b.type.toUpperCase()}</span>
                        <div class="text-xs text-gray-400 mt-0.5">剩餘工期: ${b.daysLeft} 天 | 完工合約認列金額: <span class="text-green-400 font-bold font-mono">$${app.formatMoney(b.price)}</span></div>
                    </div>
                    <span class="text-yellow-400 font-mono animate-pulse">專案施工中...</span>
                </div>`;
            });
        } else {
            html += `<div class="text-gray-400 text-center py-4">目前沒有任何在手合約排隊訂單。</div>`;
        }
        html += `</div>`;
        return html;
    },

    // ==========================================
    // 3. 玩家操作互動 (Actions - 全數刷新 UI)
    // ==========================================
    startTapeOut(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        
        let cost = 0; let days = 0; let name = '';
        if (type === 'mobile') { cost = 30000000; days = 30; name = '下一代手機 5G SoC'; }
        else if (type === 'auto') { cost = 50000000; days = 45; name = '先進車載核心 MCU 晶片'; }
        else if (type === 'ai') { cost = 150000000; days = 90; name = '極限 AI 先進算力晶片'; }

        // [新增修正] 政策研發補貼 20%
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalCost = isFirstYearSubsidized ? Math.floor(cost * 0.8) : cost;

        if (corp.corporateCash >= finalCost) {
            corp.corporateCash -= finalCost;
            corp.monthExpense = (corp.monthExpense || 0) + finalCost; // [記帳] 大額支出計入月度財務報表
            corp.semiState.activeProjects.push({ id: `PRJ-${Date.now()}`, type, name, daysLeft: days });
            let subsidyMsg = isFirstYearSubsidized ? ` (獲國家晶片法案研發補貼 20% 減免)` : '';
            app.log(`【流片立項】${corp.name} 斥資 $${app.formatMoney(finalCost)}${subsidyMsg} 開啟 [${name}] 開發！將於 ${days} 天後開箱結果。`, "text-cyan font-bold");
            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】企業現金不足以支付流片成本！需要 $${app.formatMoney(finalCost)}。`, "text-red-500");
        }
    },

    buyFab(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        
        let price = type === 'fab8' ? 150000000 : 500000000;
        let capacity = type === 'fab8' ? 500 : 2000;
        let maint = type === 'fab8' ? 50000 : 180000;

        // [新增修正] 政策擴產補貼 20%
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalPrice = isFirstYearSubsidized ? Math.floor(price * 0.8) : price;

        if (corp.corporateCash >= finalPrice) {
            corp.corporateCash -= finalPrice;
            corp.monthExpense = (corp.monthExpense || 0) + finalPrice; // [記帳] 大額支出計入月度財務報表
            corp.semiState.fabs.push({ id: `FAB-${Date.now()}`, type, capacity, dailyMaint: maint });
            let subsidyMsg = isFirstYearSubsidized ? ` (享國家政策擴產補貼 20% 減免)` : '';
            app.log(`【建廠擴產】${corp.name} 發動資本擴張！斥資 $${app.formatMoney(finalPrice)}${subsidyMsg}，日產能增加 ${capacity} 片晶圓。`, "text-green-400");
            
            // 下單給 漢唐 (無塵室廠務) 與特用製程設備廠 (辛耘/弘塑/萬潤)
            const ht = app.state.stocks.find(s => s.id === '2404');
            if (ht && ht.semiState && ht.semiState.backlog.length < ht.semiState.constructionCapacity) {
                let contractVal = Math.floor(finalPrice * 0.12);
                ht.semiState.backlog.push({ id: `B-${Date.now()}`, clientName: corp.name, type: '廠房無塵室工程', daysLeft: 25, price: contractVal });
                app.log(`【供應鏈連動】漢唐 (2404) 自動承包該項無塵室廠務！合約額 $${app.formatMoney(contractVal)}。`, "text-purple-300");
            }

            const pTool = app.state.stocks.find(s => ['3131', '3583', '6187'].includes(s.id));
            if (pTool && pTool.semiState) {
                let contractVal = Math.floor(finalPrice * 0.08);
                pTool.semiState.backlog.push({ id: `B-${Date.now()}`, clientName: corp.name, type: '製程清洗/點膠設備', daysLeft: 18, price: contractVal });
                app.log(`【供應鏈連動】特用設備商 ${pTool.name} 自動獲取濕製程/清洗機台大單！合約額 $${app.formatMoney(contractVal)}。`, "text-purple-300");
            }

            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】企業現金不足以購買此晶圓廠！需要 $${app.formatMoney(finalPrice)}。`, "text-red-500");
        }
    },

    buyEUV(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        
        let price = 150000000;
        const asml = app.state.stocks.find(s => s.id === 'ASML');
        if (asml && asml.semiState && asml.semiState.nextGenTech >= 100) {
            price = 250000000; // 壟斷定價
        }

        // [新增修正] 政策設備採購補貼 20%
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalPrice = isFirstYearSubsidized ? Math.floor(price * 0.8) : price;

        if (corp.corporateCash >= finalPrice) {
            corp.corporateCash -= finalPrice;
            corp.monthExpense = (corp.monthExpense || 0) + finalPrice; // [記帳] 大額支出計入月度財務報表
            corp.semiState.euvCount++;
            corp.semiState.yieldRate = Math.min(0.99, corp.semiState.yieldRate + 0.04);
            
            let subsidyMsg = isFirstYearSubsidized ? ` (享國家晶片法案設備引進補貼 20% 減免)` : '';
            app.log(`【機台購置】${corp.name} 採購極紫外光 EUV 曝光機！斥資 $${app.formatMoney(finalPrice)}${subsidyMsg}，生產線良率獲大幅提振。`, "text-blue-400");
            
            if (asml && asml.semiState) {
                asml.semiState.backlog.push({ id: `B-${Date.now()}`, clientName: corp.name, type: 'EUV光刻機機台', daysLeft: 20, price: finalPrice });
                app.log(`【供應鏈連動】ASML 收到了來自 ${corp.name} 的 EUV 機台訂單！價格 $${app.formatMoney(finalPrice)}。`, "text-purple-300");
            }

            // 也給弘塑/辛耘帶來機台周邊安裝訂單
            const pTool = app.state.stocks.find(s => ['3131', '3583'].includes(s.id));
            if (pTool && pTool.semiState) {
                let contractVal = Math.floor(finalPrice * 0.1);
                pTool.semiState.backlog.push({ id: `B-${Date.now()}`, clientName: corp.name, type: 'EUV裝機與清洗特用設備', daysLeft: 10, price: contractVal });
            }

            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(finalPrice)} 才能購買 EUV 機台！`, "text-red-500");
        }
    },

    upgradeNode(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        
        const price = 100000000;
        // [新增修正] 政策研發微縮補貼 20%
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalPrice = isFirstYearSubsidized ? Math.floor(price * 0.8) : price;

        if (corp.corporateCash >= finalPrice) {
            corp.corporateCash -= finalPrice;
            corp.monthExpense = (corp.monthExpense || 0) + finalPrice; // [記帳] 大額支出計入月度財務報表
            const nodes = ['28nm', '16nm', '7nm', '5nm', '3nm', '2nm'];
            let currentIdx = nodes.indexOf(corp.semiState.processNode);
            if (currentIdx < nodes.length - 1) {
                corp.semiState.processNode = nodes[currentIdx + 1];
                // 良率崩跌
                corp.semiState.yieldRate = Math.max(0.35, corp.semiState.yieldRate - 0.40);
                let subsidyMsg = isFirstYearSubsidized ? ` (享晶片法案製程微縮補貼 20% 減免)` : '';
                app.log(`【製程升級】${corp.name} 斥資 $${app.formatMoney(finalPrice)}${subsidyMsg} 跨入 [${nodes[currentIdx + 1]}] 先進製程！新製程初期良率跌至 ${(corp.semiState.yieldRate*100).toFixed(1)}%，請儘速進行優化！`, "text-cyan font-bold");
            } else {
                app.log(`【物理極限】${corp.name} 的製程已達現有當代極限！`, "text-yellow-400");
            }
            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】製程奈米微縮需要 $${app.formatMoney(finalPrice)} 研發資金！`, "text-red-500");
        }
    },

    optimizeYield(corpId) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        
        const price = 30000000;
        // [新增修正] 政策良率優化補貼 20%
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        let finalPrice = isFirstYearSubsidized ? Math.floor(price * 0.8) : price;

        if (corp.corporateCash >= finalPrice) {
            corp.corporateCash -= finalPrice;
            corp.monthExpense = (corp.monthExpense || 0) + finalPrice; // [記帳] 大額支出計入月度財務報表
            let euvBonus = corp.semiState.euvCount * 0.01;
            let gain = 0.05 + (Math.random() * 0.05) + euvBonus;
            corp.semiState.yieldRate = Math.min(0.99, corp.semiState.yieldRate + gain);
            let subsidyMsg = isFirstYearSubsidized ? ` (享晶片法案參數優化補貼 20% 減免)` : '';
            app.log(`【良率改善】${corp.name} 斥資 $${app.formatMoney(finalPrice)}${subsidyMsg} 優化了晶圓廠製程參數！當前良率提升至 ${(corp.semiState.yieldRate*100).toFixed(1)}%。`, "text-green-400");
            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】良率工程師調校需要 $${app.formatMoney(finalPrice)} 現金！`, "text-red-500");
        }
    },

    changeIDMAllocation(corpId, value) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        corp.semiState.idmAllocation = parseInt(value) / 100;
        app.log(`【產能戰策】IDM 公司 ${corp.name} 產能重新調配：自用 ${value}%，外部接單代工 ${100-value}%。`, "text-yellow-400");
        this.refreshSemiTabUI(corp);
    },

    // --- 各客製化子模型專屬 Action ---
    upgradeTech(corpId, modelType) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;
        
        const price = 100000000;
        if (corp.corporateCash >= price) {
            corp.corporateCash -= price;
            corp.monthExpense = (corp.monthExpense || 0) + price; // [記帳] 大額支出計入月度財務報表
            corp.semiState.nextGenTech += 25;
            if (corp.semiState.nextGenTech >= 100) {
                app.log(`【技術專利壟斷】🎉 ASML 成功完成 High-NA 曝光專利研發！達成絕對壟斷，未來出貨合約單價裝配為 $250M！`, "text-purple-400 font-bold");
            } else {
                app.log(`【曝光機研發】ASML 次世代技術研發進度：${corp.semiState.nextGenTech}%。`, "text-purple-300");
            }
            this.refreshSemiTabUI(corp);
        } else {
            app.log("【資金不足】研發次世代微影機台需要 $100M！", "text-red-500");
        }
    },

    upgradeConstruction(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        let cost = type === 'capacity' ? 30000000 : 20000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost; // [記帳] 大額支出計入月度財務報表
            if (type === 'capacity') {
                corp.semiState.constructionCapacity += 1;
                app.log(`【擴建工程隊】漢唐同時能承接與消化施工的廠房工程上限增加至 ${corp.semiState.constructionCapacity} 件。`, "text-yellow-500");
            } else {
                corp.semiState.constructionCostEfficiency = Math.max(0.6, corp.semiState.constructionCostEfficiency - 0.1);
                app.log(`【供應談判】漢唐談判成功！工程施工材料成本降低，合約純益提高。`, "text-green-400");
            }
            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(cost)} 進行此操作！`, "text-red-500");
        }
    },

    upgradeWafer(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        let cost = type === 'capacity' ? 50000000 : 30000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost; // [記帳] 大額支出計入月度財務報表
            if (type === 'capacity') {
                corp.semiState.waferCapacity += 1000;
                app.log(`【擴建拉晶爐】環球晶矽晶圓日產量產能上限提升 1000 片！`, "text-cyan font-bold");
            } else {
                corp.semiState.purityLevel = Math.min(11.9, corp.semiState.purityLevel + 0.5);
                corp.semiState.waferPrice = Math.floor(corp.semiState.waferPrice * 1.15);
                app.log(`【矽晶高純度】環球晶完成高純度提煉！材料純度達 ${corp.semiState.purityLevel}N 尖端級，矽晶圓單價調漲 15% 至 $${corp.semiState.waferPrice}。`, "text-green-400");
            }
            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(cost)} 進行此操作！`, "text-red-500");
        }
    },

    upgradeSubstrate(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        let cost = type === 'capacity' ? 80000000 : 50000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost; // [記帳] 大額支出計入月度財務報表
            if (type === 'capacity') {
                corp.semiState.substrateCapacity += 800;
                app.log(`【載板廠擴建】欣興 ABF 高級載板日產能上限增加 800 片。`, "text-magenta font-bold");
            } else {
                corp.semiState.advancedLayerTech += 4;
                corp.semiState.substratePrice = Math.floor(corp.semiState.substratePrice * 1.25);
                app.log(`【載板細線寬】載板層數研發突破！達 ${corp.semiState.advancedLayerTech} 層級，載板出貨均價調升 25% 至 $${corp.semiState.substratePrice}。`, "text-green-400");
            }
            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(cost)} 進行此操作！`, "text-red-500");
        }
    },

    upgradeOSAT(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        let cost = type === 'cowos' ? 120000000 : 40000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost; // [記帳] 大額支出計入月度財務報表
            if (type === 'cowos') {
                corp.semiState.cowosCapacity += 150;
                app.log(`【先進封測擴增】日月光 CoWoS 2.5D 先進封裝生產線產能日增 150 片！`, "text-cyan font-bold");
            } else {
                corp.semiState.cowosYield = Math.min(0.99, corp.semiState.cowosYield + 0.03);
                corp.semiState.pkgYield = Math.min(0.995, corp.semiState.pkgYield + 0.005);
                app.log(`【封裝良率優化】封膠與切割良率參數微調成功！CoWoS 先進封裝良率回升至 ${(corp.semiState.cowosYield*100).toFixed(1)}%。`, "text-green-400");
            }
            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(cost)} 進行此操作！`, "text-red-500");
        }
    },

    upgradeProcessEquip(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        let cost = type === 'precision' ? 50000000 : 20000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost; // [記帳] 大額支出計入月度財務報表
            if (type === 'precision') {
                corp.semiState.precisionLevel += 0.20;
                app.log(`【精度提升】${corp.name} 製程定位機械精度大幅升級！所有未來新設備接單利潤率加成。`, "text-blue-400");
            } else {
                corp.semiState.precisionLevel += 0.05; // 供應鏈優化小幅提升均價
                app.log(`【零件國產化】零組件採購本地化，製程清洗設備零件成本削減！`, "text-green-400");
            }
            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(cost)} 進行此操作！`, "text-red-500");
        }
    },

    upgradeAsicService(corpId, type) {
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        let cost = type === 'team' ? 40000000 : 80000000;
        if (corp.corporateCash >= cost) {
            corp.corporateCash -= cost;
            corp.monthExpense = (corp.monthExpense || 0) + cost; // [記帳] 大額支出計入月度財務報表
            if (type === 'team') {
                corp.semiState.teamCount += 1;
                app.log(`【擴建設計團隊】${corp.name} 引進 ASIC 高階 SoC 設計部門！最大同時承接工程案上限增加至 ${corp.semiState.teamCount} 個。`, "text-cyan font-bold");
            } else {
                corp.semiState.nextGenTech = 100; // 完成 CoWoS IP 研發
                app.log(`【CoWoS IP大突破】創意/世芯 成功研發先進 3D 矽光子/CoWoS 高速封裝 IP！未來承包先進封裝 NRE 的合約均價大幅飆漲！`, "text-green-400 font-bold");
            }
            this.refreshSemiTabUI(corp);
        } else {
            app.log(`【資金不足】需要 $${app.formatMoney(cost)} 進行此操作！`, "text-red-500");
        }
    },

    // 輔助函式：操作完立刻重新整理 Tab UI
    refreshSemiTabUI(corp) {
        const contentArea = document.getElementById('ceo-detail-tab-content');
        if (contentArea) {
            const isReadOnly = corp.isPlayerFounded ? false : (corp.playerRole ? false : true);
            this.renderSemiTab(corp, contentArea, isReadOnly);
        }
        // [新增修正] 雙重防護：操作後即時更新公司頂部現金顯示，解決自創設備公司等現金未刷新的顯示 Bug
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl && typeof app !== 'undefined') {
            cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        }
        if (typeof app !== 'undefined' && app.updateUI) {
            app.updateUI();
        }
    },

    // ==========================================
    // 4. 每日營收與供應鏈 Feedback Loop 結算 (Process Revenue)
    // ==========================================
    processRevenue(corp) {
        if (!corp.semiState) this.initAssets(corp); // [自我修復] 自創或讀檔時若缺少 semiState 自動重塑
        const state = corp.semiState;
        let dailyRev = 0;
        let dailyExp = 0;
        let sci = app.state.SCI || 100;

        // 避免未設定子模型的自創設備廠爆出結算錯誤
        if (corp.bizModel === 'equipment' && state.subModel === 'generic') {
            return; 
        }

        // --- Fabless (IC Design 晶片銷售) ---
        if (corp.bizModel === 'design') {
            // 處理流片進度
            for (let i = state.activeProjects.length - 1; i >= 0; i--) {
                let p = state.activeProjects[i];
                p.daysLeft--;
                if (p.daysLeft <= 0) {
                    let successRate = p.type === 'mobile' ? 0.9 : (p.type === 'auto' ? 0.7 : 0.4);
                    if (Math.random() < successRate) {
                        let baseRev = p.type === 'mobile' ? 400000 : (p.type === 'auto' ? 900000 : 2500000);
                        state.launchedProducts.push({ id: `P-${Date.now()}`, name: p.name, type: p.type, marketShare: 0.5, dailyRevBase: baseRev, age: 0 });
                        app.log(`【流片大成功】🎉 ${corp.name} 的 [${p.name}] 晶片流片大功告成！產品即刻商用，迎來超高毛利專利費。`, "text-green-400 font-bold");
                    } else {
                        app.log(`【💥 流片失敗】${corp.name} 的 [${p.name}] 晶片存在致命電路 Bug，Tape-out 宣告完敗！數千萬開發資金蒸發。`, "text-red-500 font-bold animate-pulse");
                    }
                    state.activeProjects.splice(i, 1);
                }
            }

            // 產品線營收與代工/封測支出
            let outsourceExpense = 0;
            state.launchedProducts.forEach(p => {
                p.age++;
                let decay = Math.max(0.1, 1 - (p.age / 365));
                let currentDaily = p.dailyRevBase * decay * (sci / 100);
                dailyRev += currentDaily;
                outsourceExpense += currentDaily * 0.40; // 40% 為製造成本 (25% 晶圓製造, 15% 封測測試)
            });
            dailyExp += outsourceExpense;

            // 連動：將製造成本轉化為 Foundry (25%) 與 OSAT (15%) 的收入
            if (outsourceExpense > 0) {
                let foundryAmt = outsourceExpense * (25 / 40);
                let osatAmt = outsourceExpense * (15 / 40);

                let foundries = app.state.stocks.filter(x => x.sector === 'semi' && (x.bizModel === 'foundry' || x.bizModel === 'idm'));
                if (foundries.length > 0) {
                    let target = foundries[Math.floor(Math.random() * foundries.length)];
                    target.corporateCash = (target.corporateCash || 0) + foundryAmt;
                    target.monthRevenue = (target.monthRevenue || 0) + foundryAmt;
                }

                let osats = app.state.stocks.filter(x => x.sector === 'semi' && x.semiState && x.semiState.subModel === 'osat');
                if (osats.length > 0) {
                    let target = osats[Math.floor(Math.random() * osats.length)];
                    target.corporateCash = (target.corporateCash || 0) + osatAmt;
                    target.monthRevenue = (target.monthRevenue || 0) + osatAmt;
                }

                // 載板需求連動：載板廠 (欣興 3037) 自動獲取一部分的 ABF 載板日營收
                let substrates = app.state.stocks.filter(x => x.sector === 'semi' && x.semiState && x.semiState.subModel === 'substrate');
                if (substrates.length > 0) {
                    let subAmt = outsourceExpense * 0.05; // 載板費用
                    let target = substrates[Math.floor(Math.random() * substrates.length)];
                    let finalSubAmt = Math.min(subAmt, (target.semiState.substrateCapacity || 1000) * (target.semiState.substratePrice || 80));
                    target.corporateCash = (target.corporateCash || 0) + finalSubAmt;
                    target.monthRevenue = (target.monthRevenue || 0) + finalSubAmt;
                }
            }
        }

        // --- Foundry (晶圓代工) ---
        else if (corp.bizModel === 'foundry') {
            let totalCapacity = 0;
            let maintExpenseVal = 0;
            state.fabs.forEach(f => { totalCapacity += f.capacity; maintExpenseVal += f.dailyMaint; });
            
            let utilization = Math.min(100, Math.max(30, Math.floor(sci * 0.9)));
            let dailyWafers = Math.floor(totalCapacity * (utilization / 100));
            
            // 材料成本 (環球晶 6488 上游材料商連動)
            let rawSiliconCost = dailyWafers * 300;
            let chemistryCost = dailyWafers * 200;
            dailyExp += maintExpenseVal + rawSiliconCost + chemistryCost;
            
            // 良率廢片耗損
            let wasteWafers = Math.floor(dailyWafers * (1 - state.yieldRate));
            dailyExp += wasteWafers * 800; // 廢片原料折損費
            
            let nodePrice = 3000;
            if (state.processNode === '16nm') nodePrice = 5000;
            else if (state.processNode === '7nm') nodePrice = 10000;
            else if (state.processNode === '5nm') nodePrice = 16000;
            else if (state.processNode === '3nm') nodePrice = 26000;
            else if (state.processNode === '2nm') nodePrice = 39000;
            
            let shippedWafers = dailyWafers - wasteWafers;
            dailyRev += shippedWafers * nodePrice;
            
            // 材料連動：每日所消耗的矽晶圓與化學成本的 50% 直接化為環球晶 (6488) 的營業額！
            if (rawSiliconCost > 0) {
                const gw = app.state.stocks.find(x => x.id === '6488');
                if (gw && gw.semiState) {
                    let gwRev = Math.min(rawSiliconCost * 0.5, (gw.semiState.waferCapacity || 1000) * (gw.semiState.waferPrice || 320));
                    gw.corporateCash = (gw.corporateCash || 0) + gwRev;
                    gw.monthRevenue = (gw.monthRevenue || 0) + gwRev;
                }
            }
        }

        // --- IDM (整合製造) ---
        else if (corp.bizModel === 'idm') {
            let totalCapacity = 0;
            let maintExpenseVal = 0;
            state.fabs.forEach(f => { totalCapacity += f.capacity; maintExpenseVal += f.dailyMaint; });
            
            let utilization = Math.min(100, Math.max(30, Math.floor(sci * 0.9)));
            let dailyWafers = Math.floor(totalCapacity * (utilization / 100));
            
            let rawSiliconCost = dailyWafers * 300;
            let chemistryCost = dailyWafers * 200;
            dailyExp += maintExpenseVal + rawSiliconCost + chemistryCost;
            
            let wasteWafers = Math.floor(dailyWafers * (1 - state.yieldRate));
            dailyExp += wasteWafers * 800;
            
            let shippedWafers = dailyWafers - wasteWafers;
            let alloc = state.idmAllocation || 0.7;
            let selfWafers = Math.floor(shippedWafers * alloc);
            let outsourceWafers = shippedWafers - selfWafers;
            
            let nodePrice = 3000;
            if (state.processNode === '16nm') nodePrice = 5000;
            else if (state.processNode === '7nm') nodePrice = 10000;
            else if (state.processNode === '5nm') nodePrice = 16000;
            else if (state.processNode === '3nm') nodePrice = 26000;
            else if (state.processNode === '2nm') nodePrice = 39000;
            
            dailyRev += outsourceWafers * nodePrice; // 外部接單代工
            
            let chipPrice = nodePrice * 2.5; // 自家晶片利潤翻倍
            dailyRev += selfWafers * chipPrice;
            
            // 材料連動：送給環球晶 6488
            if (rawSiliconCost > 0) {
                const gw = app.state.stocks.find(x => x.id === '6488');
                if (gw && gw.semiState) {
                    let gwRev = Math.min(rawSiliconCost * 0.5, (gw.semiState.waferCapacity || 1000) * (gw.semiState.waferPrice || 320));
                    gw.corporateCash = (gw.corporateCash || 0) + gwRev;
                    gw.monthRevenue = (gw.monthRevenue || 0) + gwRev;
                }
            }
        }

        // --- 設計服務與 IP 授權 (Design Service) [創意/世芯] ---
        else if (corp.bizModel === 'design_service') {
            // NRE 專案進度消化 (NRE 設計費)
            for (let i = state.backlog.length - 1; i >= 0; i--) {
                let b = state.backlog[i];
                b.daysLeft--;
                if (b.daysLeft <= 0) {
                    let finalPrice = state.nextGenTech >= 100 ? b.price * 1.5 : b.price; // 先進 IP 溢價
                    dailyRev += finalPrice;
                    app.log(`【ASIC設計案交付】${corp.name} 順利完成客戶客製化晶片 NRE 設計服務，一次性認列高毛利營收 $${app.formatMoney(finalPrice)}！`, "text-cyan font-bold");
                    
                    // 完工後自動將該案送入 Royalty 案源池 (客戶拿到設計圖開始量產)
                    let waferRun = Math.floor(50 + Math.random() * 50);
                    let royaltyRate = state.nextGenTech >= 100 ? 250 : 120;
                    state.royaltyPool.push({ id: `R-${Date.now()}`, name: `${b.clientName}量產分潤案`, dailyWaferRun: waferRun, royaltyPerWafer: royaltyRate });
                    
                    state.backlog.splice(i, 1);
                }
            }

            // 結算日常高毛利 Royalty (權利金) 營收 (跟隨全球 SCI 指數微調)
            state.royaltyPool.forEach(r => {
                let currentDaily = r.dailyWaferRun * r.royaltyPerWafer * (sci / 100);
                dailyRev += currentDaily;
            });

            dailyExp += dailyRev * 0.15; // 僅需研發人事維護成本 (85% 超高毛利率)

            // 自動隨機捕獲新委託案 (若團隊有空檔)
            if (state.backlog.length < state.teamCount && Math.random() < 0.05) {
                let isHighEnd = state.nextGenTech >= 100 && Math.random() > 0.4;
                let price = isHighEnd ? 120000000 : 50000000;
                let days = isHighEnd ? 40 : 20;
                let name = isHighEnd ? '客戶 3nm 高階 AI 加速晶片' : '客戶 7nm ASIC設計案';
                state.backlog.push({ id: `B-${Date.now()}`, clientName: '美商大廠', type: name, daysLeft: days, price: price });
            }
        }

        // --- 設備、材料與先進封測 (7大子模型) ---
        else if (corp.bizModel === 'equipment') {
            const sub = state.subModel;

            // 1. ASML 曝光機
            if (sub === 'lithography') {
                // 被動化學零組件耗材營收 (隨 SCI 波動)
                let passiveRev = Math.floor((sci / 100) * 1000000); 
                if (state.nextGenTech >= 100) passiveRev *= 2; // 先進技術壟斷翻倍
                dailyRev += passiveRev;
                dailyExp += passiveRev * 0.3; // 維護售後成本

                // 消化 EUV 機台 Backlog 訂單
                for (let i = state.backlog.length - 1; i >= 0; i--) {
                    let b = state.backlog[i];
                    b.daysLeft--;
                    if (b.daysLeft <= 0) {
                        dailyRev += b.price;
                        app.log(`【曝光機交付】ASML 成功將 [EUV光刻機機台] 運裝至 ${b.clientName} 廠房，一次性高額認列 $${app.formatMoney(b.price)} 營收！`, "text-purple-400 font-bold");
                        state.backlog.splice(i, 1);
                    }
                }
            } 
            
            // 2. 漢唐 (無塵室工程)
            else if (sub === 'facility') {
                let costEff = state.constructionCostEfficiency || 1.0;
                
                // 消化在手工程 backlog (最多同時承載隊數)
                let activeCount = 0;
                for (let i = state.backlog.length - 1; i >= 0; i--) {
                    let b = state.backlog[i];
                    if (activeCount < state.constructionCapacity) {
                        activeCount++;
                        b.daysLeft--;
                        if (b.daysLeft <= 0) {
                            dailyRev += b.price;
                            dailyExp += b.price * 0.75 * costEff; // 75% 施工材料工料成本
                            app.log(`【廠務包案竣工】漢唐 (2404) 承建的 ${b.clientName} [${b.type}] 順利竣工交付！認列營收 $${app.formatMoney(b.price)}。`, "text-yellow-500 font-bold");
                            state.backlog.splice(i, 1);
                        }
                    }
                }
            } 
            
            // 3. 環球晶 (矽晶圓日營收)
            else if (sub === 'wafer') {
                // 上游物理拉貨。Foundry 與 IDM 在 processRevenue 時已經主動把錢分給了環球晶 (Wafer 材料日進帳)
                // 這裡僅作拉晶爐基本日常維護與極限產能打折折損
                dailyExp += state.waferCapacity * 30; // 日常拉晶爐保養耗能
            } 
            
            // 4. 欣興 (ABF載板日營收)
            else if (sub === 'substrate') {
                // 欣興的日營收與 Fabless 的 AI 與手機晶片銷量掛鉤 (由 Fabless 分潤注入)
                // 欣興的日產能與精度高低會限制最大可吃下的載板金額
                dailyExp += state.substrateCapacity * 12; // 產線折舊
            } 
            
            // 5. 日月光投控 (先進封測 OSAT)
            else if (sub === 'osat') {
                // 分潤在 Fabless 銷售產品線時，將 15% 封測測試費自動送入日月光
                // 傳統與 CoWoS 先進封裝的保養成本
                dailyExp += state.pkgCapacity * 8 + state.cowosCapacity * 80;
            } 
            
            // 6. 萬潤/辛耘/弘塑 (製程特用設備)
            else if (sub === 'process_equip') {
                let precisionBonus = state.precisionLevel || 1.0;
                
                // 消化機台訂單
                for (let i = state.backlog.length - 1; i >= 0; i--) {
                    let b = state.backlog[i];
                    b.daysLeft--;
                    if (b.daysLeft <= 0) {
                        let finalPrice = Math.floor(b.price * precisionBonus);
                        dailyRev += finalPrice;
                        dailyExp += finalPrice * 0.50; // 50% 零組件製造成本
                        app.log(`【精密機台完工】特用設備廠 ${corp.name} 向 ${b.clientName} 順利出貨 [${b.type}]，認列大額機台營收 $${app.formatMoney(finalPrice)}！`, "text-blue-400 font-bold");
                        state.backlog.splice(i, 1);
                    }
                }
            }
        }
        
        // [新增修正] 國家晶片法案政策扶持：
        let daysOldForSub = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstYearSubsidized = (corp.isPlayerFounded && daysOldForSub <= 90) || (corp.isListed && ipoDaysOld <= 90);
        if (isFirstYearSubsidized) {
            // A. 日常人事與營運折舊成本減免 50%
            dailyExp = Math.floor(dailyExp * 0.5);

            // B. 材料/封測（矽晶圓、IC載板、OSAT）第一年每日政策日營收補貼
            if (corp.bizModel === 'equipment' && corp.semiState) {
                const sub = corp.semiState.subModel;
                if (sub === 'wafer') {
                    dailyRev += 20000; // 矽晶圓每日補貼 20,000 美金
                } else if (sub === 'substrate') {
                    dailyRev += 15000; // ABF載板每日補貼 15,000 美金
                } else if (sub === 'osat') {
                    dailyRev += 25000; // 封測日產線每日補貼 25,000 美金
                }
            }
        }

        // 安全性限幅與 NaN 全域防禦
        if (isNaN(dailyRev) || dailyRev === undefined || dailyRev < 0) dailyRev = 0;
        if (isNaN(dailyExp) || dailyExp === undefined || dailyExp < 0) dailyExp = 0;

        corp.corporateCash = (corp.corporateCash || 0) + dailyRev - dailyExp;
        if (corp.corporateCash < 0) corp.corporateCash = 0;
        corp.monthRevenue = (corp.monthRevenue || 0) + dailyRev;
        corp.monthExpense = (corp.monthExpense || 0) + dailyExp;
        corp.lastDailyRev = dailyRev;
        corp.lastDailyExp = dailyExp;
    }
};

window.CEO_SEMI = CEO_SEMI;
