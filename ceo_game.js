// ceo_game.js - 遊戲與文創產業核心模擬模組
// 全台灣繁體中文實作，無任何簡體字

const CEO_GAME = {
    // 遊戲類型定義 (Genre Definition)
    GENRES: {
        'rpg_action': { name: '🎮 重度動作冒險 / 史詩 RPG', costMult: 1.5, timeMult: 1.5, qualityMax: 120, hypeFactor: 1.8, hardwareSensitivity: 1.5, aiBenefit: 0 },
        'casual_strategy': { name: '🧩 大眾休閒益智 / 策略模擬', costMult: 0.6, timeMult: 0.7, qualityMax: 90, hypeFactor: 1.0, hardwareSensitivity: 0.5, aiBenefit: 0.15 },
        'fps_moba': { name: '🔫 戰術電競射擊 / 多人競技', costMult: 1.2, timeMult: 1.0, qualityMax: 100, hypeFactor: 1.2, hardwareSensitivity: 1.0, aiBenefit: 0 },
        'anime_gacha': { name: '🦄 動漫抽卡 / 二次元 RPG', costMult: 1.0, timeMult: 1.0, qualityMax: 100, hypeFactor: 1.5, hardwareSensitivity: 0.8, aiBenefit: 0.05 }
    },

    // 手遊細分類型
    LIVE_OPS_TYPES: {
        'heavy_mmo': { name: '⚔️ 重度國戰 MMO (極高課金/高流失)', ltv: 350, cpa: 120, serverLoad: 1.4 },
        'casual_card': { name: '🃏 休閒抽卡策略 (中等穩健/易擴散)', ltv: 150, cpa: 40, serverLoad: 0.8 },
        'anime_gacha': { name: '🎨 二次元唯美抽卡 (超強信仰/易炎上)', ltv: 280, cpa: 80, serverLoad: 1.0 }
    },

    // 初始化資產
    initAssets(corp) {
        if (!corp) return;
        corp.subModelChosen = corp.bizModel ? true : false;
        
        // 確保基本數值安全
        if (corp.corporateCash === undefined || isNaN(corp.corporateCash)) {
            corp.corporateCash = corp.initialCapital || 5000000;
        }

        // 判斷是否為非玩家創立的上市公司，給予合理的初始值
        const isPlayer = corp.isPlayerFounded || false;

        if (corp.bizModel === 'aaa_studio') {
            corp.gameData = {
                currentGenre: 'rpg_action',
                projectProgress: isPlayer ? 0 : 100,
                projectQuality: isPlayer ? 0 : 85,
                projectHype: isPlayer ? 10 : 80,
                rdDays: isPlayer ? 0 : 240,
                countdown: isPlayer ? 120 : 0,
                hasReleased: isPlayer ? false : true,
                metacriticScore: isPlayer ? 0 : 88,
                totalSales: isPlayer ? 0 : Math.floor(corp.corporateCash * 1.5),
                releaseDays: isPlayer ? 0 : 180,
                discountRate: 0.0,
                isRding: false
            };
        } else if (corp.bizModel === 'live_ops') {
            corp.gameData = {
                subType: 'casual_card',
                mau: isPlayer ? 5000 : 250000,
                retentionRate: 0.80,
                gachaRate: 2.0, // 抽卡機率 2%
                marketingBudget: isPlayer ? 1000 : 15000,
                prCrisis: 0, // 炎上值
                isBattlePassMode: false,
                hasOverseasServer: false,
                activePatchCycle: 30
            };
        } else if (corp.bizModel === 'ip_franchise') {
            corp.gameData = {
                ipValue: isPlayer ? 10000000 : 80000000, // IP 價值
                brandReputation: 85, // 品牌商譽
                activeProjects: {
                    anime: false,
                    movie: false,
                    park: false
                },
                projectSuccess: {
                    anime: 0,
                    movie: 0,
                    park: 0
                }
            };
        } else if (corp.bizModel === 'platform') {
            corp.gameData = {
                taxRate: 30, // 平台稅 30%
                developerCount: isPlayer ? 100 : 4500,
                ccu: isPlayer ? 5000 : 180000,
                serverLevel: isPlayer ? 1 : 6,
                isDown: false,
                downHours: 0,
                hasOverseasServer: false
            };
        }
    },

    // 渲染遊戲與文創面板主入口
    renderGameTab(corp, contentArea, isReadOnly) {
        if (!corp) return;

        // NaN 防護
        if (!corp.gameData) {
            this.initAssets(corp);
        }

        let html = '';

        // 唯讀模式橫幅
        const readOnlyBanner = isReadOnly ? `
            <div class="bg-yellow-900 bg-opacity-20 border border-yellow-800 text-yellow-400 text-xs p-2 mb-4 text-center rounded">
                🔒 唯讀模式：您正在觀察其他集團旗下的企業，無法變更其決策拉桿或執行主動營運。
            </div>
        ` : '';

        // 如果是玩家創辦且尚未選擇 subModel
        if (corp.isPlayerFounded && !corp.subModelChosen) {
            this.renderSubModelSelectionUI(corp, contentArea);
            return;
        }

        html += readOnlyBanner;

        // 頂部企業基本面與大盤景氣連動資訊
        const gci = app.state.GCI || 100;
        const sci = app.state.SCI || 100;
        const eci = app.state.ECI || 100;
        const aiCostDiscount = sci > 120 ? 20 : 0; // AI 減免
        
        html += `
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="panel p-3 border-red-900 bg-red-950 bg-opacity-10 text-center">
                    <div class="text-xs text-gray-400">遊戲文創景氣 (GCI)</div>
                    <div class="text-xl font-bold text-red-400">${gci.toFixed(1)}</div>
                    <div class="text-[10px] text-gray-500">影響日常銷量與買量成本</div>
                </div>
                <div class="panel p-3 border-blue-900 bg-blue-950 bg-opacity-10 text-center">
                    <div class="text-xs text-gray-400">硬體消費熱度 (ECI)</div>
                    <div class="text-xl font-bold text-blue-400">${eci.toFixed(1)}</div>
                    <div class="text-[10px] text-gray-500">高於 120 觸發次世代換機潮</div>
                </div>
                <div class="panel p-3 border-green-900 bg-green-950 bg-opacity-10 text-center">
                    <div class="text-xs text-gray-400">AI 賦能研發減免</div>
                    <div class="text-xl font-bold text-green-400">${aiCostDiscount}%</div>
                    <div class="text-[10px] text-gray-500">取決於半導體與網路景氣</div>
                </div>
            </div>
        `;

        // 依據不同的 bizModel 渲染對應的面板
        if (corp.bizModel === 'aaa_studio') {
            html += this.renderAaaStudioUI(corp, isReadOnly);
        } else if (corp.bizModel === 'live_ops') {
            html += this.renderLiveOpsUI(corp, isReadOnly);
        } else if (corp.bizModel === 'ip_franchise') {
            html += this.renderIpFranchiseUI(corp, isReadOnly);
        } else if (corp.bizModel === 'platform') {
            html += this.renderPlatformUI(corp, isReadOnly);
        }

        contentArea.innerHTML = html;
    },

    // 渲染二次子業務選擇面板（玩家新創公司空殼啟動後，在此選擇細分路徑）
    renderSubModelSelectionUI(corp, contentArea) {
        let html = `
            <div class="p-4 text-center">
                <h3 class="text-xl text-yellow-400 font-bold mb-2">🚀 選擇企業核心業務模型</h3>
                <p class="text-sm text-gray-400 mb-6">您已創立遊戲文創公司。請在下方四大變現模型中選擇一條核心發展路線（選擇後不可變更）：</p>
                
                <div class="grid grid-cols-2 gap-4 text-left">
                    <div class="panel p-5 border-purple-500 bg-purple-950 bg-opacity-10 hover:border-purple-400 transition cursor-pointer flex flex-col justify-between" onclick="CEO_GAME.selectSubModel('${corp.id}', 'aaa_studio')">
                        <div>
                            <div class="text-lg font-bold text-purple-400 mb-2">💿 3A 單機與主機大作 (AAA Studio)</div>
                            <p class="text-xs text-gray-400 leading-relaxed mb-3">孤注一擲的研發豪賭。耗時數年，在無營收狀態下打造極致大作。首發銷量受媒體評分（Metacritic）決定，支援打折促銷與跳票抉擇。</p>
                        </div>
                        <button class="btn-retro py-1 text-xs border-purple-500 text-purple-400 w-full mt-2">啟動單機大作工坊</button>
                    </div>

                    <div class="panel p-5 border-cyan-500 bg-cyan-950 bg-opacity-10 hover:border-cyan-400 transition cursor-pointer flex flex-col justify-between" onclick="CEO_GAME.selectSubModel('${corp.id}', 'live_ops')">
                        <div>
                            <div class="text-lg font-bold text-cyan-400 mb-2">📱 手遊與線上服務 (Live-Ops / Gacha)</div>
                            <p class="text-xs text-gray-400 leading-relaxed mb-3">數據與買量驅動的流量機器。免費下載，靠課金與抽卡活動為核心。調整轉蛋吃相拉桿平衡流失率，推送Patch與輿論公關博弈。</p>
                        </div>
                        <button class="btn-retro py-1 text-xs border-cyan-500 text-cyan-400 w-full mt-2">部署流量營運中心</button>
                    </div>

                    <div class="panel p-5 border-yellow-500 bg-yellow-950 bg-opacity-10 hover:border-yellow-400 transition cursor-pointer flex flex-col justify-between" onclick="CEO_GAME.selectSubModel('${corp.id}', 'ip_franchise')">
                        <div>
                            <div class="text-lg font-bold text-yellow-400 mb-2">🦄 泛娛樂 IP 授權 (IP Franchise)</div>
                            <p class="text-xs text-gray-400 leading-relaxed mb-3">跨媒體收割的品牌印鈔機。圍繞核心遊戲旗艦IP價值，投資好萊塢真人電影、衍生電視動畫、甚至授權主題樂園，帶來高額被動營收。</p>
                        </div>
                        <button class="btn-retro py-1 text-xs border-yellow-500 text-yellow-400 w-full mt-2">開啟 IP 宇宙擴張</button>
                    </div>

                    <div class="panel p-5 border-emerald-500 bg-emerald-950 bg-opacity-10 hover:border-emerald-400 transition cursor-pointer flex flex-col justify-between" onclick="CEO_GAME.selectSubModel('${corp.id}', 'platform')">
                        <div>
                            <div class="text-lg font-bold text-emerald-400 mb-2">🌐 UGC 平台與發行通路 (Platform)</div>
                            <p class="text-xs text-gray-400 leading-relaxed mb-3">穩健收稅的生態系霸主。提供點數通路或 UGC 創作者工具，向開發者抽取平台過路費。調整平台稅率、升級伺服器防範大當機危機。</p>
                        </div>
                        <button class="btn-retro py-1 text-xs border-emerald-500 text-emerald-400 w-full mt-2">啟動發行稅收平台</button>
                    </div>
                </div>
            </div>
        `;
        contentArea.innerHTML = html;
    },

    // 選擇 subModel 後初始化資源
    selectSubModel(corpId, type) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;

        corp.bizModel = type;
        corp.subModelChosen = true;
        this.initAssets(corp);

        app.log(`【決策部署】您決定將 ${corp.name} 轉型為「${this.getBizModelChineseName(type)}」模式，開始配置初始資產！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    // 業務中文名對照
    getBizModelChineseName(type) {
        switch (type) {
            case 'aaa_studio': return '3A 單機與主機大作';
            case 'live_ops': return '手遊與線上服務';
            case 'ip_franchise': return '泛娛樂 IP 授權';
            case 'platform': return 'UGC 平台與發行通路';
            default: return '遊戲文創公司';
        }
    },

    // ==========================================
    // 3A 單機主機大作 (aaa_studio) UI
    // ==========================================
    renderAaaStudioUI(corp, isReadOnly) {
        const gd = corp.gameData;
        const currentGenreInfo = this.GENRES[gd.currentGenre] || this.GENRES['rpg_action'];
        const disableAttr = isReadOnly ? 'disabled' : '';

        let html = '';

        if (!gd.isRding && !gd.hasReleased) {
            // 尚未開始研發，顯示類型選擇介面
            html += `
                <div class="panel p-5 border-purple-500">
                    <h4 class="text-lg text-purple-400 font-bold mb-3">💿 啟動全新 3A 遊戲研發專案</h4>
                    <div class="mb-4">
                        <label class="text-xs text-gray-400">選擇創作遊戲類型 (Genre):</label>
                        <select id="aaa-genre-select" class="bg-black border border-purple-800 text-white w-full p-2 outline-none mt-1" ${disableAttr}>
                            ${Object.entries(this.GENRES).map(([key, value]) => `
                                <option value="${key}">${value.name} (成本: x${value.costMult}, 時間: x${value.timeMult}, 品質上限: ${value.qualityMax})</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="text-xs text-gray-400 mb-4 leading-relaxed bg-purple-900 bg-opacity-20 p-3 border border-purple-900">
                        💡 <strong>設計師提示：</strong><br>
                        重度動作冒險/RPG品質上限最高，但研發漫長且成本極高；休閒策略遊戲受 AI 賦能的成本減免幅度最大（可高達 35%），且銷量走勢抗跌；多競技遊戲依賴長期維護。
                    </div>
                    ${!isReadOnly ? `
                        <button class="btn-retro py-2 w-full text-center border-purple-500 text-purple-400 hover:bg-purple-950 font-bold" onclick="CEO_GAME.startNewAaaProject('${corp.id}')">
                            🚀 確認立項並開始注資研發 (立項規費 $500,000)
                        </button>
                    ` : ''}
                </div>
            `;
        } else if (gd.isRding && !gd.hasReleased) {
            // 正在研發中，顯示進度條、跳票與發售控制
            const dailyCost = Math.floor(2500 * currentGenreInfo.costMult * (app.state.SCI > 120 ? 0.8 : 1.0)); // 包含 AI 下修
            const progress = gd.projectProgress || 0;
            const quality = gd.projectQuality || 0;
            const hype = gd.projectHype || 0;

            html += `
                <div class="panel p-5 border-purple-500">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="text-lg text-purple-400 font-bold">🛠️ 3A 大作研發與宣發控制台</h4>
                        <span class="text-xs text-gray-400">當前類型: <strong class="text-white">${currentGenreInfo.name}</strong></span>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-black bg-opacity-40 p-3 border border-gray-800">
                            <div class="text-xs text-gray-400">預估每日研發淨支出</div>
                            <div class="text-lg font-bold text-red-400">$${app.formatMoney(dailyCost)}</div>
                            <div class="text-[10px] text-gray-500">已研發時間: ${gd.rdDays} 天</div>
                        </div>
                        <div class="bg-black bg-opacity-40 p-3 border border-gray-800">
                            <div class="text-xs text-gray-400">發售倒數計時</div>
                            <div class="text-lg font-bold text-yellow font-bold">${gd.countdown} 天</div>
                            <div class="text-[10px] text-gray-500">進度落後時可宣布跳票避險</div>
                        </div>
                    </div>

                    <div class="space-y-3 mb-6">
                        <div>
                            <div class="flex justify-between text-xs text-gray-400 mb-1">
                                <span>研發進度</span>
                                <span class="text-cyan font-bold">${progress.toFixed(1)}%</span>
                            </div>
                            <div class="w-full bg-gray-900 h-2 border border-gray-800 rounded">
                                <div class="bg-cyan-500 h-full rounded" style="width: ${Math.min(100, progress)}%"></div>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between text-xs text-gray-400 mb-1">
                                <span>產品品質分</span>
                                <span class="text-green-400 font-bold">${quality.toFixed(1)} / ${currentGenreInfo.qualityMax}</span>
                            </div>
                            <div class="w-full bg-gray-900 h-2 border border-gray-800 rounded">
                                <div class="bg-green-500 h-full rounded" style="width: ${Math.min(100, (quality / currentGenreInfo.qualityMax) * 100)}%"></div>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between text-xs text-gray-400 mb-1">
                                <span>專案宣發熱度 (Hype)</span>
                                <span class="text-magenta font-bold">${hype.toFixed(1)}</span>
                            </div>
                            <div class="w-full bg-gray-900 h-2 border border-gray-800 rounded">
                                <div class="bg-magenta-500 h-full rounded" style="width: ${Math.min(100, hype)}%"></div>
                            </div>
                        </div>
                    </div>

                    ${!isReadOnly ? `
                        <div class="grid grid-cols-3 gap-2">
                            <button class="btn-retro py-2 border-magenta text-magenta hover:bg-magenta-950 font-bold text-xs" onclick="CEO_GAME.hypeAaaProject('${corp.id}')">
                                📢 追加宣發預算<br><span class="text-[10px] text-gray-400">消耗 $1,000,000 現金</span>
                            </button>
                            <button class="btn-retro py-2 border-red-500 text-red-400 hover:bg-red-950 font-bold text-xs" onclick="CEO_GAME.launchAaaProjectNow('${corp.id}')">
                                🚀 強行上市銷售<br><span class="text-[10px] text-gray-400">品質不足將引發 Bug 退款潮</span>
                            </button>
                            <button class="btn-retro py-2 border-yellow text-yellow hover:bg-yellow-950 font-bold text-xs" onclick="CEO_GAME.delayAaaProject('${corp.id}')">
                                ⏱️ 宣布延遲跳票<br><span class="text-[10px] text-gray-400">延長60天 / 股價重挫10%</span>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (gd.hasReleased) {
            // 已經發售，顯示首發表現與長尾促銷機制
            const score = gd.metacriticScore || 0;
            let scoreColor = 'text-green-400';
            if (score < 75) scoreColor = 'text-yellow';
            if (score < 60) scoreColor = 'text-red-500';

            html += `
                <div class="panel p-5 border-purple-500">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-lg text-purple-400 font-bold">📈 3A 遊戲銷售與長尾營運面板</h4>
                        <span class="bg-gray-900 border border-gray-800 text-white text-xs px-2 py-1 rounded">上市第 ${gd.releaseDays} 天</span>
                    </div>

                    <div class="grid grid-cols-3 gap-3 mb-4">
                        <div class="bg-black bg-opacity-40 p-3 border border-gray-800 text-center">
                            <div class="text-xs text-gray-400">媒體評分 (Metacritic)</div>
                            <div class="text-2xl font-bold ${scoreColor}">${score} 分</div>
                            <div class="text-[9px] text-gray-500">影響日常玩家自然增長</div>
                        </div>
                        <div class="bg-black bg-opacity-40 p-3 border border-gray-800 text-center">
                            <div class="text-xs text-gray-400">累計總銷量營收</div>
                            <div class="text-lg font-bold text-green-400 font-bold">$${app.formatMoney(gd.totalSales)}</div>
                            <div class="text-[9px] text-gray-500">已扣除退款支出</div>
                        </div>
                        <div class="bg-black bg-opacity-40 p-3 border border-gray-800 text-center">
                            <div class="text-xs text-gray-400">當前折扣幅度</div>
                            <div class="text-lg font-bold text-magenta">${(gd.discountRate * 100).toFixed(0)}% OFF</div>
                            <div class="text-[9px] text-gray-500">降價能短暫拉升銷量</div>
                        </div>
                    </div>

                    <div class="bg-purple-900 bg-opacity-10 border border-purple-900 p-3 text-xs text-gray-400 mb-4 leading-relaxed">
                        📊 <strong>長尾銷售趨勢：</strong><br>
                        目前每日自然銷量以 1.5% 自然遞減。當前自然銷售係數為 <strong>${Math.pow(0.985, gd.releaseDays).toFixed(3)}</strong>。<br>
                        如果您正在經歷銷售末期，可以開啟「特賣打折」來快速清理長尾以變現，或者決定關閉此專案以開啟下一款 3A 新巨作。
                    </div>

                    ${!isReadOnly ? `
                        <div class="grid grid-cols-2 gap-3">
                            <div class="panel border-gray-800 p-3">
                                <label class="text-xs text-gray-400">設置折扣活動 (Steam 特賣):</label>
                                <div class="grid grid-cols-4 gap-1 mt-2">
                                    <button class="btn-retro py-1 text-xs ${gd.discountRate === 0.0 ? 'border-magenta text-magenta' : 'border-gray-700 text-gray-500'}" onclick="CEO_GAME.setAaaDiscount('${corp.id}', 0.0)">原價</button>
                                    <button class="btn-retro py-1 text-xs ${gd.discountRate === 0.33 ? 'border-magenta text-magenta' : 'border-gray-700 text-gray-500'}" onclick="CEO_GAME.setAaaDiscount('${corp.id}', 0.33)">-33%</button>
                                    <button class="btn-retro py-1 text-xs ${gd.discountRate === 0.5 ? 'border-magenta text-magenta' : 'border-gray-700 text-gray-500'}" onclick="CEO_GAME.setAaaDiscount('${corp.id}', 0.5)">-50%</button>
                                    <button class="btn-retro py-1 text-xs ${gd.discountRate === 0.75 ? 'border-magenta text-magenta' : 'border-gray-700 text-gray-500'}" onclick="CEO_GAME.setAaaDiscount('${corp.id}', 0.75)">-75%</button>
                                </div>
                            </div>
                            <div class="flex items-center justify-center">
                                <button class="btn-retro py-3 w-full border-green-500 text-green-400 hover:bg-green-950 font-bold" onclick="CEO_GAME.restartAaaProject('${corp.id}')">
                                    🔄 收尾此專案，立項研發新遊戲
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        return html;
    },

    startNewAaaProject(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        if (corp.corporateCash < 500000) return alert("公司企業資金不足，無法支付 $500,000 的立項開支！");

        const genreSelect = document.getElementById('aaa-genre-select');
        const chosenGenre = genreSelect ? genreSelect.value : 'rpg_action';

        corp.corporateCash -= 500000;
        gd.currentGenre = chosenGenre;
        gd.projectProgress = 0;
        gd.projectQuality = 5;
        gd.projectHype = 15;
        gd.rdDays = 0;
        
        // 預設倒數天數
        const genreInfo = this.GENRES[chosenGenre];
        gd.countdown = Math.floor(120 * genreInfo.timeMult);
        
        gd.isRding = true;
        gd.hasReleased = false;

        app.log(`【立項研發】${corp.name} 啟動了全新 3A 遊戲《專案: ${chosenGenre.toUpperCase()}》的注資研發！`, 'text-purple-400 font-bold');
        this.refreshGameTabUI(corp);
    },

    hypeAaaProject(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        if (corp.corporateCash < 1000000) return alert("公司企業資金不足，無法支付 $1,000,000 宣發預算！");

        corp.corporateCash -= 1000000;
        
        let hypeGain = 25 + Math.random() * 15;
        // 如果品質太低，宣發熱度會有折扣
        if (gd.projectQuality < 20) {
            hypeGain *= 0.5;
            app.log(`【輿論警告】${corp.name} 因產品研發品質落後，強推廣告引起部分玩家反彈！`, 'text-yellow');
        }

        gd.projectHype += hypeGain;
        app.log(`【市場宣發】${corp.name} 追加宣發行銷支出，大幅推升玩家期待度 +${hypeGain.toFixed(1)}！`, 'text-magenta');
        this.refreshGameTabUI(corp);
    },

    delayAaaProject(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        // 股價重挫 10%
        const prevPrice = corp.price;
        corp.price *= 0.9;
        if (corp.price < 0.01) corp.price = 0.01;

        gd.countdown += 60;
        
        // 品質增加
        gd.projectQuality += 15;

        app.log(`【延期跳票】${corp.name} 宣布跳票！發售日推遲 60 天以完善品質，產品品質提升 +15。投資人信心受挫，股價從 $${prevPrice.toFixed(2)} 重挫至 $${corp.price.toFixed(2)} (-10%)！`, 'text-yellow font-bold');
        this.refreshGameTabUI(corp);
    },

    launchAaaProjectNow(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        const genreInfo = this.GENRES[gd.currentGenre];
        
        // 計算評分
        let baseQuality = gd.projectQuality;
        // 進度懲罰 (進度不足會成指數級折損品質)
        const progressFactor = gd.projectProgress / 100;
        baseQuality = baseQuality * Math.pow(progressFactor, 3.0);

        let hypeBonus = gd.projectHype * 0.15;
        let score = Math.floor(baseQuality + hypeBonus + (Math.random() - 0.5) * 15);
        
        // 品質分上限
        score = Math.max(30, Math.min(genreInfo.qualityMax, score));

        gd.metacriticScore = score;
        gd.hasReleased = true;
        gd.isRding = false;
        gd.releaseDays = 1;
        gd.discountRate = 0.0;

        // 首月爆發銷量
        // Hype 作為基數乘數
        let initSales = gd.projectHype * 120000 * genreInfo.hypeFactor * (score / 75);
        
        // 評分極限加乘
        if (score >= 90) {
            initSales *= 2.5; // 指數爆發
            app.log(`【神作誕生】媒體解禁！《Metacritic》給予高達 ${score} 的神作極高評分！首發排隊熱潮引爆！`, 'text-green-400 font-bold text-lg');
        } else if (score < 60) {
            initSales *= 0.3; // 銷量慘澹，Bug 退貨
            app.log(`【嚴重炎上】媒體評分解禁！遭遇評分慘案僅 ${score} 分！Bug 滿天飛，引發玩家大批退款！`, 'text-red-500 font-bold text-lg');
            const refundCost = initSales * 0.4;
            corp.corporateCash = Math.max(0, corp.corporateCash - refundCost);
            app.log(`【退款重創】扣除退貨手續費與玩家退款共計 $${app.formatMoney(refundCost)} 現金！`, 'text-red-400');
        } else {
            app.log(`【常規發售】媒體綜合評分 ${score} 分。銷量符合預期。`, 'text-yellow');
        }

        gd.totalSales = Math.floor(initSales);
        corp.corporateCash += Math.floor(initSales);

        // 次世代主機換機潮連動 (electronics Buff 1.5x)
        if (app.state.ECI > 120 && genreInfo.hardwareSensitivity > 0.5) {
            const extraBuff = Math.floor(initSales * 0.5);
            corp.corporateCash += extraBuff;
            gd.totalSales += extraBuff;
            app.log(`【主機換機潮】搭上次世代主機發售順風車，銷售獲全域額外 1.5 倍 Buff！現金再進帳 +$${app.formatMoney(extraBuff)}！`, 'text-blue-400');
        }

        this.refreshGameTabUI(corp);
    },

    setAaaDiscount(corpId, rate) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        corp.gameData.discountRate = parseFloat(rate);
        app.log(`【價格策略】${corp.name} 將該款遊戲調整為 Steam ${rate === 0.0 ? '原價' : `打折 -${rate*100}%`} 促銷模式！`, 'text-magenta');
        this.refreshGameTabUI(corp);
    },

    restartAaaProject(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        corp.gameData = {
            currentGenre: 'rpg_action',
            projectProgress: 0,
            projectQuality: 0,
            projectHype: 10,
            rdDays: 0,
            countdown: 120,
            hasReleased: false,
            metacriticScore: 0,
            totalSales: 0,
            releaseDays: 0,
            discountRate: 0.0,
            isRding: false
        };
        app.log(`【重置專案】${corp.name} 單機工廠完成上一專案結算，重置面板準備立項全新 3A 遊戲！`, 'text-purple-400');
        this.refreshGameTabUI(corp);
    },


    // ==========================================
    // 手遊與線上服務 (live_ops) UI
    // ==========================================
    renderLiveOpsUI(corp, isReadOnly) {
        const gd = corp.gameData;
        const currentTypeInfo = this.LIVE_OPS_TYPES[gd.subType] || this.LIVE_OPS_TYPES['casual_card'];
        const disableAttr = isReadOnly ? 'disabled' : '';

        // 計算留存率影響
        const retentionColor = gd.retentionRate > 0.8 ? 'text-green-400' : (gd.retentionRate > 0.65 ? 'text-yellow' : 'text-red-500');
        const prColor = gd.prCrisis > 50 ? 'text-red-500 font-bold' : (gd.prCrisis > 20 ? 'text-yellow' : 'text-green-400');

        let html = `
            <div class="panel p-5 border-cyan-500">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-lg text-cyan-400 font-bold">📱 手遊流量與內購控制台</h4>
                    <span class="text-xs text-gray-400">當前定位: <strong class="text-white">${currentTypeInfo.name}</strong></span>
                </div>

                <div class="grid grid-cols-4 gap-2 mb-4">
                    <div class="bg-black bg-opacity-40 p-2 border border-gray-800 text-center">
                        <div class="text-[10px] text-gray-400">月活躍用戶 (MAU)</div>
                        <div class="text-lg font-bold text-cyan-400">${app.formatMoney(Math.floor(gd.mau))}</div>
                    </div>
                    <div class="bg-black bg-opacity-40 p-2 border border-gray-800 text-center">
                        <div class="text-[10px] text-gray-400">玩家留存率</div>
                        <div class="text-lg font-bold ${retentionColor}">${(gd.retentionRate * 100).toFixed(1)}%</div>
                    </div>
                    <div class="bg-black bg-opacity-40 p-2 border border-gray-800 text-center">
                        <div class="text-[10px] text-gray-400">輿論炎上值</div>
                        <div class="text-lg font-bold ${prColor}">${gd.prCrisis.toFixed(1)}%</div>
                    </div>
                    <div class="bg-black bg-opacity-40 p-2 border border-gray-800 text-center">
                        <div class="text-[10px] text-gray-400">海外伺服器</div>
                        <div class="text-sm font-bold text-white mt-1">${gd.hasOverseasServer ? '🟢 已架設' : '❌ 未開拓'}</div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="panel border-gray-800 p-3 bg-black bg-opacity-20">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-gray-400">每日行銷買量預算:</span>
                            <span class="text-green-400 font-bold">$${app.formatMoney(gd.marketingBudget)}</span>
                        </div>
                        <input type="range" min="0" max="50000" step="1000" class="w-full cursor-pointer accent-green-500" value="${gd.marketingBudget}" ${disableAttr} oninput="CEO_GAME.updateMarketingBudget('${corp.id}', this.value)">
                        <div class="text-[9px] text-gray-500 mt-1 flex justify-between">
                            <span>$0</span>
                            <span>加強買量可拉升 MAU</span>
                            <span>$50,000</span>
                        </div>
                    </div>

                    <div class="panel border-gray-800 p-3 bg-black bg-opacity-20">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-gray-400">抽卡機率吃相拉桿:</span>
                            <span class="text-yellow font-bold">${gd.gachaRate.toFixed(1)}%</span>
                        </div>
                        <input type="range" min="0.5" max="5.0" step="0.1" class="w-full cursor-pointer accent-yellow" value="${gd.gachaRate}" ${disableAttr} oninput="CEO_GAME.updateGachaRate('${corp.id}', this.value)">
                        <div class="text-[9px] text-gray-500 mt-1 flex justify-between">
                            <span>0.5% (極坑/ARPU暴漲)</span>
                            <span>5.0% (佛心/利潤降)</span>
                        </div>
                    </div>
                </div>

                <div class="bg-cyan-950 bg-opacity-10 border border-cyan-900 p-3 text-xs text-gray-400 mb-4 leading-relaxed">
                    ⚖️ <strong>營運動態：</strong><br>
                    - 當前買量成本 (CPA): <strong class="text-white">$${(currentTypeInfo.cpa * (100 / (app.state.GCI || 100))).toFixed(1)}</strong> /人。用戶 LTV: <strong class="text-green-400">$${currentTypeInfo.ltv}</strong>。<br>
                    - 收費模式: <strong class="text-white">${gd.isBattlePassMode ? '🎟️ Battle Pass 模式 (零波動、穩健收益)' : '💎 轉蛋抽卡模式 (高爆發、受吃相波動)'}</strong>
                </div>

                ${!isReadOnly ? `
                    <div class="grid grid-cols-3 gap-2">
                        <button class="btn-retro py-2 border-cyan-500 text-cyan-400 hover:bg-cyan-950 font-bold text-xs" onclick="CEO_GAME.deployLiveOpsPatch('${corp.id}')">
                            🆕 推送大版本更新<br><span class="text-[10px] text-gray-400">研發大包 $1,500,000</span>
                        </button>
                        <button class="btn-retro py-2 border-green-500 text-green-400 hover:bg-green-950 font-bold text-xs" onclick="CEO_GAME.sendLiveOpsCompensation('${corp.id}')">
                            💎 發放補償石頭<br><span class="text-[10px] text-gray-400">發放 $300,000 挽回留存</span>
                        </button>
                        <button class="btn-retro py-2 border-blue-500 text-blue-400 hover:bg-blue-950 font-bold text-xs" onclick="CEO_GAME.expandOverseasServer('${corp.id}')" ${gd.hasOverseasServer ? 'disabled style="opacity: 0.5;"' : ''}>
                            🌐 開拓海外服務器<br><span class="text-[10px] text-gray-400">花費 $5,000,000 規避法規</span>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        return html;
    },

    updateMarketingBudget(corpId, val) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        corp.gameData.marketingBudget = parseInt(val) || 0;
        this.refreshGameTabUI(corp);
    },

    updateGachaRate(corpId, val) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        corp.gameData.gachaRate = parseFloat(val) || 2.0;
        this.refreshGameTabUI(corp);
    },

    deployLiveOpsPatch(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        if (corp.corporateCash < 1500000) return alert("公司企業資金不足，無法支付 $1,500,000 大版本研發費！");

        corp.corporateCash -= 1500000;
        
        // 增加 MAU 與 LTV，但有 20% 機率數值膨脹引發玩家不滿
        gd.mau += gd.mau * (0.15 + Math.random() * 0.1);
        
        if (Math.random() < 0.22) {
            gd.prCrisis += 35;
            app.log(`【數值崩壞】${corp.name} 發布的大版本更新中，新角色強度過度膨脹 (Power Creep) 引發老玩家集體炎上！輿論炎上值大增！`, 'text-red-500 font-bold');
        } else {
            gd.prCrisis = Math.max(0, gd.prCrisis - 10);
            app.log(`【版本更新】${corp.name} 順利推送全新資料片《神魔之境》，月活躍用戶大幅增長！`, 'text-green-400');
        }

        this.refreshGameTabUI(corp);
    },

    sendLiveOpsCompensation(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        if (corp.corporateCash < 300000) return alert("公司企業資金不足，無法支付 $300,000 的玩家補償費！");

        corp.corporateCash -= 300000;
        gd.prCrisis = Math.max(0, gd.prCrisis - 40);
        gd.retentionRate = Math.min(0.95, gd.retentionRate + 0.05);

        app.log(`【補償發放】${corp.name} 緊急對全服玩家發放「補償石頭」與「道歉聲明」，成功安撫玩家，輿論大幅平息，留存率回穩！`, 'text-green-400 font-bold');
        this.refreshGameTabUI(corp);
    },

    expandOverseasServer(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        if (corp.corporateCash < 5000000) return alert("公司企業資金不足，無法支付 $5,000,000 的海外開拓費用！");

        corp.corporateCash -= 5000000;
        gd.hasOverseasServer = true;

        app.log(`【海外佈局】${corp.name} 斥資架設全球跨區伺服器，成功拓展海外市場，未來可徹底規避國內法規的黑天鵝打擊！`, 'text-blue-400 font-bold');
        this.refreshGameTabUI(corp);
    },


    // ==========================================
    // 泛娛樂 IP 授權 (ip_franchise) UI
    // ==========================================
    renderIpFranchiseUI(corp, isReadOnly) {
        const gd = corp.gameData;
        const repColor = gd.brandReputation > 80 ? 'text-green-400' : (gd.brandReputation > 50 ? 'text-yellow' : 'text-red-500');

        let html = `
            <div class="panel p-5 border-yellow-500">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-lg text-yellow-400 font-bold">🦄 IP 跨媒體衍生宇宙地圖</h4>
                    <span class="text-xs text-gray-400">品牌商譽: <strong class="${repColor}">${gd.brandReputation}%</strong></span>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="bg-black bg-opacity-40 p-3 border border-gray-800">
                        <div class="text-xs text-gray-400">旗艦 IP 影響力價值</div>
                        <div class="text-xl font-bold text-yellow font-bold">$${app.formatMoney(gd.ipValue)}</div>
                        <div class="text-[10px] text-gray-500">授權合約金的計算基底</div>
                    </div>
                    <div class="bg-black bg-opacity-40 p-3 border border-gray-800">
                        <div class="text-xs text-gray-400">每日合計被動授權金</div>
                        <div class="text-xl font-bold text-green-400">$${app.formatMoney(Math.floor(gd.ipValue * 0.0003 * (gd.brandReputation / 100)))}</div>
                        <div class="text-[10px] text-gray-500">受品牌商譽高低加乘</div>
                    </div>
                </div>

                <div class="panel border-gray-800 p-4 mb-4 bg-black bg-opacity-20">
                    <h5 class="text-xs text-gray-300 font-bold mb-3">📍 跨媒體衍生計畫狀態</h5>
                    <div class="grid grid-cols-3 gap-3">
                        <div class="bg-black p-3 border ${gd.activeProjects.anime ? 'border-purple-500 bg-purple-950 bg-opacity-10' : 'border-gray-800'} rounded text-center">
                            <div class="text-sm font-bold ${gd.activeProjects.anime ? 'text-purple-400' : 'text-gray-600'}">📺 改編動畫</div>
                            <div class="text-[10px] text-gray-500 mt-1">${gd.activeProjects.anime ? `已解鎖 / 成功 ${gd.projectSuccess.anime} 次` : '未投資'}</div>
                            ${!isReadOnly && !gd.activeProjects.anime ? `
                                <button class="btn-retro py-1 px-2 text-[10px] border-purple-500 text-purple-400 mt-2 hover:bg-purple-950" onclick="CEO_GAME.investDerivative('${corp.id}', 'anime')">投資 $30M</button>
                            ` : ''}
                        </div>

                        <div class="bg-black p-3 border ${gd.activeProjects.movie ? 'border-magenta bg-magenta-950 bg-opacity-10' : 'border-gray-800'} rounded text-center">
                            <div class="text-sm font-bold ${gd.activeProjects.movie ? 'text-magenta' : 'text-gray-600'}">🎬 真人電影</div>
                            <div class="text-[10px] text-gray-500 mt-1">${gd.activeProjects.movie ? `已解鎖 / 成功 ${gd.projectSuccess.movie} 次` : '未投資'}</div>
                            ${!isReadOnly && !gd.activeProjects.movie ? `
                                <button class="btn-retro py-1 px-2 text-[10px] border-magenta text-magenta mt-2 hover:bg-magenta-950" onclick="CEO_GAME.investDerivative('${corp.id}', 'movie')">投資 $120M</button>
                            ` : ''}
                        </div>

                        <div class="bg-black p-3 border ${gd.activeProjects.park ? 'border-yellow-500 bg-yellow-950 bg-opacity-10' : 'border-gray-800'} rounded text-center">
                            <div class="text-sm font-bold ${gd.activeProjects.park ? 'text-yellow' : 'text-gray-600'}">🎡 主題樂園</div>
                            <div class="text-[10px] text-gray-500 mt-1">${gd.activeProjects.park ? `已解鎖 / 成功 ${gd.projectSuccess.park} 次` : '未投資'}</div>
                            ${!isReadOnly && !gd.activeProjects.park ? `
                                <button class="btn-retro py-1 px-2 text-[10px] border-yellow text-yellow mt-2 hover:bg-yellow-950" onclick="CEO_GAME.investDerivative('${corp.id}', 'park')">投資 $500M</button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                ${!isReadOnly ? `
                    <button class="btn-retro py-2 w-full text-center border-yellow-500 text-yellow-400 hover:bg-yellow-950 font-bold" onclick="CEO_GAME.runIpPrCampaign('${corp.id}')">
                        🛡️ 啟動品牌商譽公關維護 ($2,000,000 現金，提升商譽 15 點)
                    </button>
                ` : ''}
            </div>
        `;

        return html;
    },

    investDerivative(corpId, projKey) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        let cost = 0;
        let projName = '';

        if (projKey === 'anime') { cost = 30000000; projName = '衍生電視改編動畫'; }
        else if (projKey === 'movie') { cost = 120000000; projName = '好萊塢真人改編電影'; }
        else if (projKey === 'park') { cost = 500000000; projName = '授權世界主題樂園'; }

        if (corp.corporateCash < cost) return alert(`公司企業資金不足，無法支付 $${app.formatMoney(cost)} 的投資支出！`);

        corp.corporateCash -= cost;
        gd.activeProjects[projKey] = true;
        gd.projectSuccess[projKey] = 1;

        // 計算立即隨機效應
        if (projKey === 'anime') {
            gd.ipValue += 20000000;
            app.log(`【IP 跨界】${corp.name} 投資的改編動畫大獲好評，全網爆紅！原始旗艦 IP 價值暴增 +$20M，且帶動旗下遊戲流量協同暴增！`, 'text-purple-400 font-bold');
        } else if (projKey === 'movie') {
            if (Math.random() < 0.45) {
                gd.ipValue += 80000000;
                gd.brandReputation = Math.min(100, gd.brandReputation + 10);
                app.log(`【影遊共振】好萊塢真人改編電影橫掃全球票房！旗下 IP 價值史詩級爆發 +$80M，品牌商譽大幅提升！`, 'text-green-400 font-bold');
            } else {
                gd.brandReputation = Math.max(30, gd.brandReputation - 25);
                app.log(`【票房慘案】真人電影選角與魔改引發嚴重「政治正確爭議」，影評崩潰，導致品牌商譽重挫 -25 點！`, 'text-red-500 font-bold');
            }
        } else if (projKey === 'park') {
            gd.ipValue += 200000000;
            app.log(`【天價授權】樂園竣工剪彩！旗下知名 IP 實體主題園區正式開幕，帶來巨額且極度穩定的每日被動過路授權金！`, 'text-yellow font-bold');
        }

        this.refreshGameTabUI(corp);
    },

    runIpPrCampaign(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        if (corp.corporateCash < 2000000) return alert("公司企業資金不足，無法支付 $2,000,000 公關預算！");

        corp.corporateCash -= 2000000;
        gd.brandReputation = Math.min(100, gd.brandReputation + 15);
        app.log(`【公關營銷】${corp.name} 執行全球品牌商譽維護 campaign，成功修補粉絲關係，商譽值提升 +15！`, 'text-yellow font-bold');
        this.refreshGameTabUI(corp);
    },


    // ==========================================
    // UGC平台與發行通路 (platform) UI
    // ==========================================
    renderPlatformUI(corp, isReadOnly) {
        const gd = corp.gameData;
        const disableAttr = isReadOnly ? 'disabled' : '';

        // 伺服器承載能力
        const maxCcu = gd.serverLevel * 50000;
        const isOverloaded = gd.ccu > maxCcu;
        const statusText = gd.isDown ? '🔴 系統大當機！' : (isOverloaded ? '🟡 伺服器嚴重超載' : '🟢 運作順暢');
        const statusColor = gd.isDown ? 'text-red-500 font-bold blink' : (isOverloaded ? 'text-yellow font-bold' : 'text-green-400');

        let html = `
            <div class="panel p-5 border-emerald-500">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-lg text-emerald-400 font-bold">🌐 UGC 平台生態與基礎設施面板</h4>
                    <span class="${statusColor}">${statusText}</span>
                </div>

                <div class="grid grid-cols-4 gap-2 mb-4">
                    <div class="bg-black bg-opacity-40 p-2 border border-gray-800 text-center">
                        <div class="text-[10px] text-gray-400">同時在線人數 (CCU)</div>
                        <div class="text-lg font-bold text-white">${app.formatMoney(Math.floor(gd.ccu))}</div>
                    </div>
                    <div class="bg-black bg-opacity-40 p-2 border border-gray-800 text-center">
                        <div class="text-[10px] text-gray-400">伺服器上限/等級</div>
                        <div class="text-lg font-bold text-emerald-400">${app.formatMoney(maxCcu)} (Lvl ${gd.serverLevel})</div>
                    </div>
                    <div class="bg-black bg-opacity-40 p-2 border border-gray-800 text-center">
                        <div class="text-[10px] text-gray-400">生態系開發者數</div>
                        <div class="text-lg font-bold text-yellow font-bold">${app.formatMoney(gd.developerCount)} 社團</div>
                    </div>
                    <div class="bg-black bg-opacity-40 p-2 border border-gray-800 text-center">
                        <div class="text-[10px] text-gray-400">海外發行通路</div>
                        <div class="text-sm font-bold text-white mt-1">${gd.hasOverseasServer ? '🟢 已接通' : '❌ 僅國內'}</div>
                    </div>
                </div>

                <div class="panel border-gray-800 p-3 bg-black bg-opacity-20 mb-4">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-gray-400">平台稅率 (Platform Tax Rate) 抽成拉桿:</span>
                        <span class="text-emerald-400 font-bold">${gd.taxRate}%</span>
                    </div>
                    <input type="range" min="12" max="35" step="1" class="w-full cursor-pointer accent-emerald-500" value="${gd.taxRate}" ${disableAttr} oninput="CEO_GAME.updatePlatformTax('${corp.id}', this.value)">
                    <div class="text-[9px] text-gray-500 mt-1 flex justify-between">
                        <span>12% (極致讓利/開發者暴增)</span>
                        <span>30% (Apple稅/過路費)</span>
                        <span>35% (重稅/開倒車)</span>
                    </div>
                </div>

                ${gd.isDown ? `
                    <div class="bg-red-900 bg-opacity-20 border border-red-800 text-red-400 text-xs p-3 mb-4 rounded leading-relaxed text-center font-bold">
                        ⚠️ 系統已大當機！玩家與創作者無法連接！當機時間已持續 ${gd.downHours} 天！<br>
                        若不立即搶修，當機達 2 天（結算）時將引發品牌商譽崩壞與股價重挫 -15% 的雙殺危機！
                    </div>
                ` : ''}

                ${!isReadOnly ? `
                    <div class="grid grid-cols-3 gap-2">
                        <button class="btn-retro py-2 border-emerald-500 text-emerald-400 hover:bg-emerald-950 font-bold text-xs" onclick="CEO_GAME.upgradePlatformServer('${corp.id}')">
                            🏗️ 升級伺服器架構<br><span class="text-[10px] text-gray-400">升級費 $2,500,000</span>
                        </button>
                        <button class="btn-retro py-2 border-red-500 text-red-400 hover:bg-red-950 font-bold text-xs" onclick="CEO_GAME.fixPlatformServer('${corp.id}')" ${!gd.isDown ? 'disabled style="opacity: 0.5;"' : ''}>
                            🔧 伺服器緊急搶修<br><span class="text-[10px] text-gray-400">耗資 $500,000 熱修復</span>
                        </button>
                        <button class="btn-retro py-2 border-blue-500 text-blue-400 hover:bg-blue-950 font-bold text-xs" onclick="CEO_GAME.expandPlatformOverseas('${corp.id}')" ${gd.hasOverseasServer ? 'disabled style="opacity: 0.5;"' : ''}>
                            🌐 開拓海外通路<br><span class="text-[10px] text-gray-400">開通費 $6,000,000</span>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        return html;
    },

    updatePlatformTax(corpId, val) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        corp.gameData.taxRate = parseInt(val) || 30;
        this.refreshGameTabUI(corp);
    },

    upgradePlatformServer(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        if (corp.corporateCash < 2500000) return alert("公司企業資金不足，無法支付 $2,500,000 伺服器升級費用！");

        corp.corporateCash -= 2500000;
        gd.serverLevel += 1;

        app.log(`【架構升級】${corp.name} 成功將雲端伺服器架構升級至 Level ${gd.serverLevel}，最高承載 CCU 提升至 ${gd.serverLevel * 50000} 人！`, 'text-emerald-400 font-bold');
        this.refreshGameTabUI(corp);
    },

    fixPlatformServer(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        if (corp.corporateCash < 500000) return alert("公司企業資金不足，無法支付 $500,000 搶修規費！");

        corp.corporateCash -= 500000;
        gd.isDown = false;
        gd.downHours = 0;

        app.log(`【搶修成功】${corp.name} 系統熱修復包部署成功！平台主伺服器重啟完畢，開發者與玩家重新湧入！`, 'text-green-400 font-bold');
        this.refreshGameTabUI(corp);
    },

    expandPlatformOverseas(corpId) {
        const corp = app.state.stocks.find(x => x.id === corpId);
        if (!corp) return;
        const gd = corp.gameData;

        if (corp.corporateCash < 6000000) return alert("公司企業資金不足，無法支付 $6,000,000 海外通路架設費用！");

        corp.corporateCash -= 6000000;
        gd.hasOverseasServer = true;

        app.log(`【海外開拓】${corp.name} 接通全球發行通路與多語言翻譯，成功規避國內法規之禁令黑天鵝！`, 'text-blue-400 font-bold');
        this.refreshGameTabUI(corp);
    },


    // ==========================================
    // 每日收入結算運算 (processRevenue) - 核心
    // ==========================================
    processRevenue(corp) {
        if (!corp) return;

        // NaN 防護與初始化
        if (!corp.gameData) {
            this.initAssets(corp);
        }

        const gd = corp.gameData;
        const gci = app.state.GCI || 100;
        const eci = app.state.ECI || 100;
        const sci = app.state.SCI || 100;

        // AI 美術與程式成本下修 (software_ai > 120 時 -20%)
        const isAiEnabled = sci > 120;
        
        let dailyRevenue = 0;
        let dailyCost = 0;

        if (corp.bizModel === 'aaa_studio') {
            const genreInfo = this.GENRES[gd.currentGenre] || this.GENRES['rpg_action'];
            
            if (gd.isRding && !gd.hasReleased) {
                // 研發中：只有支出
                let baseRdCost = 3500 * genreInfo.costMult;
                
                // AI 減免
                if (isAiEnabled) {
                    baseRdCost *= 0.8;
                    // 休閒策略再額外 -15%
                    if (gd.currentGenre === 'casual_strategy') {
                        baseRdCost *= 0.85; 
                    }
                }
                
                dailyCost = baseRdCost;
                
                // 研發進度遞增
                let progressGain = (1.2 / genreInfo.timeMult) * (1.0 + Math.random()*0.3);
                gd.projectProgress = Math.min(100, gd.projectProgress + progressGain);
                
                // 品質遞增
                let qualityGain = (0.9 / genreInfo.timeMult) * (1.0 + Math.random()*0.3);
                gd.projectQuality = Math.min(genreInfo.qualityMax, gd.projectQuality + qualityGain);
                
                // Hype 自然衰退
                gd.projectHype = Math.max(5, gd.projectHype * 0.985);

                gd.rdDays++;
                if (gd.countdown > 0) gd.countdown--;

                // 如果倒數結束，強制發售
                if (gd.countdown <= 0 && gd.isRding) {
                    this.launchAaaProjectNow(corp.id);
                }
            } else if (gd.hasReleased) {
                // 發售中：每日獲取長尾銷量收益
                gd.releaseDays++;
                
                // 長尾衰退因子
                // 休閒策略衰退率減半 (僅 0.75%)
                const decayRate = gd.currentGenre === 'casual_strategy' ? 0.9925 : 0.985;
                const releaseDecay = Math.pow(decayRate, gd.releaseDays);
                
                // 基礎銷量受到 Metacritic 評分與 Hype 發售基數決定
                let baseDailySales = gd.metacriticScore * 80 * (gd.discountRate > 0 ? (1.0 - gd.discountRate) : 1.0) * releaseDecay;
                
                // 打折促銷 Buff (降價促銷，銷量短期拉升 2.5~5 倍，但單價扣減)
                if (gd.discountRate > 0) {
                    let discountBuff = 1.0;
                    if (gd.discountRate === 0.33) discountBuff = 2.2;
                    else if (gd.discountRate === 0.5) discountBuff = 3.5;
                    else if (gd.discountRate === 0.75) discountBuff = 6.0;
                    baseDailySales *= discountBuff;
                }

                // 景氣連動 (GCI 連動)
                baseDailySales *= (gci / 100);

                // 電子硬體連動
                if (eci > 120 && genreInfo.hardwareSensitivity > 0.5) {
                    baseDailySales *= 1.4;
                }

                dailyRevenue = baseDailySales;
                gd.totalSales += Math.floor(dailyRevenue);

                // 自然維護成本
                dailyCost = 300 * genreInfo.costMult;
            }
        } else if (corp.bizModel === 'live_ops') {
            const typeInfo = this.LIVE_OPS_TYPES[gd.subType] || this.LIVE_OPS_TYPES['casual_card'];
            
            // 買量成本 CPA (受 GCI 負連動，景氣熱買量貴)
            let currentCpa = typeInfo.cpa * (100 / gci);
            
            // 每日行銷買入用戶
            let newUsers = 0;
            if (gd.marketingBudget > 0 && currentCpa > 0) {
                newUsers = gd.marketingBudget / currentCpa;
            }

            // 留存率受 Gacha 吃相拉桿影響
            // gachaRate 預設 2.0%。低於 1.5% 炎上值每日 +3%，高於 3% 留存率 +5%
            let gachaReputationImpact = 0;
            if (gd.gachaRate < 1.5) {
                gd.prCrisis = Math.min(100, gd.prCrisis + (1.5 - gd.gachaRate) * 1.5);
            } else if (gd.gachaRate > 3.0) {
                gd.prCrisis = Math.max(0, gd.prCrisis - (gd.gachaRate - 3.0) * 1.0);
            }

            // 留存計算
            let targetRetention = 0.85 - (gd.prCrisis * 0.003);
            targetRetention = Math.max(0.40, Math.min(0.95, targetRetention));
            gd.retentionRate = gd.retentionRate * 0.9 + targetRetention * 0.1;

            // MAU 更新
            let oldMau = gd.mau || 5000;
            let churnRate = 1.0 - gd.retentionRate;
            let activeUsers = oldMau * (1 - churnRate) + newUsers;
            gd.mau = Math.max(1000, activeUsers);

            // 營收計算 (ARPU)
            // 轉蛋吃相拉桿越高，單價越低；拉桿越低，大課長暴課高
            let arpu = (typeInfo.ltv / 30); // 基礎日 ARPU
            let arpuMultiplier = 1.0;
            if (gd.gachaRate < 2.0) {
                // 機率低，逼課
                arpuMultiplier = 1.0 + (2.0 - gd.gachaRate) * 0.8;
            } else {
                // 機率高，佛心
                arpuMultiplier = 1.0 - (gd.gachaRate - 2.0) * 0.15;
            }

            // 歐盟轉蛋法規黑天鵝連動 (強制轉型 Battle Pass 模式)
            if (gd.isBattlePassMode) {
                // 被動穩定收益，低爆發
                arpuMultiplier = 0.6;
                gd.prCrisis = 0; // 絕不炎上
            }

            let baseRevenue = gd.mau * arpu * arpuMultiplier * 0.08; // 8% 的付費率
            
            // 法規黑天鵝未成年禁令 (若無海外伺服器，營收蒸發 30%)
            const hasAntiAddictionBan = app.state.hasAntiAddictionBan || false;
            if (hasAntiAddictionBan && !gd.hasOverseasServer) {
                baseRevenue *= 0.7;
            }

            dailyRevenue = baseRevenue;

            // 每日支出 (伺服器 + 研發更新維護)
            let serverCost = gd.mau * 0.05 * typeInfo.serverLoad;
            let rdCost = gd.marketingBudget; // 行銷買量支出
            
            dailyCost = serverCost + rdCost;
        } else if (corp.bizModel === 'ip_franchise') {
            // IP 授權被動收益
            // 基礎日收益率 = 0.0003
            let repFactor = gd.brandReputation / 100;
            let baseLicensing = gd.ipValue * 0.00035 * repFactor;

            // 衍生計畫額外加成
            let animeBuff = gd.activeProjects.anime ? 1.4 : 1.0;
            let movieBuff = gd.activeProjects.movie ? 1.8 : 1.0;
            let parkRevenue = gd.activeProjects.park ? gd.ipValue * 0.0005 : 0; // 樂園提供天價穩定收益

            // 品牌商譽懲罰 (商譽跌破 40，被動收益凍結)
            if (gd.brandReputation < 40) {
                baseLicensing = 0;
                animeBuff = 1.0;
                movieBuff = 1.0;
                parkRevenue *= 0.2; // 樂園遊客大幅流失
            }

            dailyRevenue = (baseLicensing * animeBuff * movieBuff) + parkRevenue;

            // IP 日常維護與商譽公關支出
            dailyCost = gd.ipValue * 0.00005;
        } else if (corp.bizModel === 'platform') {
            const maxCcu = gd.serverLevel * 50000;
            
            // 開發者社群數受到稅率負連動
            // 稅率低 (12%)，開發者暴增；稅率高 (35%)，開發者流失
            let targetDevs = (30 / gd.taxRate) * 1500 * (gci / 100);
            gd.developerCount = gd.developerCount * 0.95 + targetDevs * 0.05;
            gd.developerCount = Math.max(10, gd.developerCount);

            // CCU 受到開發者上架內容數與稅率影響
            let targetCcu = gd.developerCount * 45 * (gci / 100);
            
            // 法規黑天鵝未成年禁玩令 (Roblox營收CCU腰斬)
            const hasAntiAddictionBan = app.state.hasAntiAddictionBan || false;
            if (hasAntiAddictionBan && !gd.hasOverseasServer) {
                targetCcu *= 0.65;
            }

            gd.ccu = gd.ccu * 0.9 + targetCcu * 0.1;

            // 伺服器負載與當機檢測
            if (gd.ccu > maxCcu * 1.2 && !gd.isDown) {
                if (Math.random() < 0.35) {
                    gd.isDown = true;
                    gd.downHours = 1;
                    app.log(`【伺服器崩潰】${corp.name} 因 CCU 人數過載，雲端主機大當機！平台手續費被動收益全面歸零，請 CEO 緊急熱修復！`, 'text-red-500 font-bold blink');
                }
            }

            if (gd.isDown) {
                gd.downHours++;
                dailyRevenue = 0; // 當機營收歸零
                
                // 大當機 2 天以上雙殺懲罰
                if (gd.downHours >= 2) {
                    corp.price *= 0.85; // 股價重挫 15%
                    if (corp.price < 0.01) corp.price = 0.01;
                    app.log(`【大當機懲罰】${corp.name} 伺服器當機時間過長，引發全球開發者集體出走建立新平台，股價重挫 -15%！`, 'text-red-400 font-bold');
                    gd.downHours = 0; // 重置計數防連續扣減
                }
            } else {
                // 平台手續費營收 = CCU * 平台稅 (taxRate) * 日交易客單基數
                let baseTaxRev = gd.ccu * 0.65 * (gd.taxRate / 100);
                dailyRevenue = baseTaxRev;
            }

            // 伺服器日常維運支出
            dailyCost = gd.serverLevel * 4500;
        }

        // 結算日常收支並扣入企業資金
        corp.corporateCash = (corp.corporateCash || 0) + Math.floor(dailyRevenue) - Math.floor(dailyCost);
        if (corp.corporateCash < 0) {
            corp.corporateCash = 0;
            // 現金斷炊警告，股價受損
            corp.price *= 0.98;
            if (corp.price < 0.01) corp.price = 0.01;
        }

        // 寫回歷史紀錄以供報表使用
        if (corp.corporateRevenueHistory) {
            corp.corporateRevenueHistory.push(Math.floor(dailyRevenue));
            if (corp.corporateRevenueHistory.length > 30) corp.corporateRevenueHistory.shift();
        }
        corp.lastDailyRev = Math.floor(dailyRevenue);
        corp.lastDailyExp = Math.floor(dailyCost);
    },

    // 輔助 UI 刷新
    refreshGameTabUI(corp) {
        const contentArea = document.getElementById('ops-tab-content');
        if (contentArea) {
            const isReadOnly = corp.isPlayerFounded ? false : true;
            this.renderGameTab(corp, contentArea, isReadOnly);
        }

        // 雙重防護：操作後即時更新公司頂部現金顯示，解決自創公司現金未刷新的顯示 Bug
        const cashEl = document.getElementById('ceo-company-cash');
        if (cashEl && typeof app !== 'undefined') {
            cashEl.innerText = `$ ${app.formatMoney(corp.corporateCash)}`;
        }

        // 調用全局 updateUI 同步更新其他畫面數據
        if (typeof app !== 'undefined' && typeof app.updateUI === 'function') {
            app.updateUI();
        }
    }
};

window.CEO_GAME = CEO_GAME;
console.log("【CEO_GAME】遊戲與文創產業核心模擬模組載入成功。");
