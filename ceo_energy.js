// ceo_energy.js - 塑膠與能源產業（四大陣營八大子模型）核心模擬子系統
// 僅使用台灣繁體中文，嚴格防範 NaN 異常

const CEO_ENERGY = {
    // ==========================================
    // 1. 初始化資產 (Init Assets)
    // ==========================================
    initAssets(corp) {
        if (!corp.energyState) {
            corp.energyState = {
                // 陣營一：舊時代的碳排巨獸 (Carbon Emitters)
                // A1. 輕油裂解與煉油廠 (refinery_cracking)
                utilization: 80,            // 產能稼動率 (0% ~ 100%)
                maintenanceMode: false,     // 停機歲修模式
                carbonCaptureRate: 0,       // 碳捕捉率 (0% ~ 90%)
                carbonCaptureLvl: 0,        // 碳捕捉系統投資等級
                
                // A2. 聚合物與塑膠纖維廠 (polymers_fibers)
                productMixPct: 20,          // 產品配比：高端纖維佔比 (0% ~ 100%)
                pcrRecycleEnabled: false,   // PCR 再生塑膠循環回收系統是否啟用
                advancedMaterialRndLvl: 0,  // 高端機能材料研發等級
                
                // B1. 水泥製造廠 (cement_kiln)
                isFurnaceOn: true,          // 旋窯點火狀態
                inventory: 100,             // 在庫水泥庫存 (噸)
                coProcessingEnabled: false, // 工業廢棄物協同處理系統是否啟用
                lowCarbonCementEnabled: false, // 超低碳煅燒水泥研發是否啟用
                greenPremiumPct: 0,         // 水泥綠色溢價率
                
                // B2. 鋼鐵冶煉廠 (steel_furnace)
                processMixPct: 80,          // 冶煉工藝雙軌比例：高爐佔比 (0% ~ 100%，電弧爐 = 100 - processMixPct)
                hydrogenSteelmakingEnabled: false, // 氫能冶金突破是否啟用
                steelInventory: 150,        // 在庫鋼材庫存 (噸)
                
                // 陣營二：新時代的電氣化救星 (Electrification)
                // C1. 高壓變壓器與電網設備廠 (transformer_grid)
                backlogOrders: [],          // 在手變壓器與電網設備訂單薄
                workersShift: 1,            // 生產班制 (1=正常單班, 2=兩班制, 3=三班制)
                usCertification: false,     // 北美安規認證是否取得
                expansionDaysLeft: 0,       // 廠房擴建賸餘天數
                expansionQty: 0,            // 擴建後新增產能
                
                // C2. 氣體絕緣開關與微電網整合商 (gis_microgrid)
                gridProjects: [],           // 執行中的台電強韌電網變電所工程標案
                emsEfficiencyLvl: 0,        // EMS 能量管理系統研發等級
                bessCapacity: 3,            // 每日儲能系統最大組裝出貨產能 (台)
                
                // D1. 綠能發電與售電公用事業 (utility_ppa)
                projects: [],               // 旗下風場與光電廠開發項目
                
                // D2. 風電水下基礎與材料製造商 (wind_materials)
                jacketProjects: [],         // 水下 Jacket 基礎鋼構建造項目
                weldingQualityLvl: 1,       // 焊接精密品質研發等級
                
                // 基礎產能與折舊基準
                capacity: 10
            };
        }

        const state = corp.energyState;
        const p = corp.price || corp.basePrice || 100;
        // 上市規模比例尺
        const scale = Math.max(1, Math.floor((p * (corp.totalShares || 1000000)) / 100000000)) || 1;

        // ==========================================
        // 玩家創立之新創公司初始資源
        // ==========================================
        if (corp.isPlayerFounded) {
            // 自創公司產能較低，以求從頭經營
            if (corp.bizModel === 'refinery_cracking') {
                state.capacity = 100; // 每日最大加工 100 桶
            } else if (corp.bizModel === 'polymers_fibers') {
                state.capacity = 50;  // 每日加工 50 噸
            } else if (corp.bizModel === 'cement_kiln') {
                state.capacity = 30;  // 每日最大 30 噸
                state.inventory = 20;
            } else if (corp.bizModel === 'steel_furnace') {
                state.capacity = 40;  // 每日最大 40 噸
                state.steelInventory = 30;
            } else if (corp.bizModel === 'transformer_grid') {
                state.capacity = 3;   // 每日最大出貨產能 3 台
                // 初始派發 1 個基本訂單，讓玩家開局能出貨
                state.backlogOrders.push({
                    id: 'ORD-INIT',
                    clientName: '台電基礎配電網',
                    totalQty: 20,
                    remQty: 20,
                    pricePerUnit: 45000,
                    costPerUnit: 15000,
                    daysLeft: 30,
                    dailyPenalty: 5000,
                    isExport: false
                });
            } else if (corp.bizModel === 'gis_microgrid') {
                state.bessCapacity = 2; // 每日儲能出貨 2 台
                state.capacity = 5;
            } else if (corp.bizModel === 'utility_ppa') {
                state.capacity = 2;
            } else if (corp.bizModel === 'wind_materials') {
                state.capacity = 2;   // 產能 2
            }
            return;
        }

        // ==========================================
        // 非玩家（上市公司）初始資源與狀態設定
        // ==========================================
        
        // A1. 輕油裂解與煉油廠 (refinery_cracking)
        if (corp.bizModel === 'refinery_cracking') {
            state.capacity = 4000 + scale * 300;
            state.utilization = 85;
            if (['6505', 'XOM', 'CVX'].includes(corp.id)) { // 台塑化、艾克森、雪佛龍
                state.carbonCaptureLvl = 3;
                state.carbonCaptureRate = 0.50; // 50% 碳捕捉
                state.capacity = 8000 + scale * 500;
            }
        }
        
        // A2. 聚合物與塑膠纖維廠 (polymers_fibers)
        else if (corp.bizModel === 'polymers_fibers') {
            state.capacity = 2000 + scale * 150;
            state.productMixPct = 25; // 25% 機能纖維
            if (['1301', '1303', '1326'].includes(corp.id)) { // 台塑三寶
                state.advancedMaterialRndLvl = 2;
                state.pcrRecycleEnabled = true;
                state.productMixPct = 35;
            }
        }
        
        // B1. 水泥製造廠 (cement_kiln)
        else if (corp.bizModel === 'cement_kiln') {
            state.capacity = 1500 + scale * 100;
            state.inventory = 500;
            if (['1101'].includes(corp.id)) { // 台泥
                state.coProcessingEnabled = true;
                state.lowCarbonCementEnabled = true;
                state.greenPremiumPct = 15; // 低碳水泥 15% 綠色溢價
            }
        }
        
        // B2. 鋼鐵冶煉廠 (steel_furnace)
        else if (corp.bizModel === 'steel_furnace') {
            state.capacity = 3000 + scale * 200;
            state.steelInventory = 800;
            state.processMixPct = 70; // 70% 高爐，30% 電弧爐
            if (['2002'].includes(corp.id)) { // 中鋼
                state.hydrogenSteelmakingEnabled = true; // 綠氫煉鋼開發完畢
            }
        }
        
        // C1. 高壓變壓器與電網設備廠 (transformer_grid)
        else if (corp.bizModel === 'transformer_grid') {
            state.capacity = 15 + scale * 2;
            state.workersShift = 2; // 上市廠預設兩班制
            state.usCertification = ['1519', 'GE'].includes(corp.id); // 華城、GE 預設通過北美認證
            
            // 上市廠初始訂單
            state.backlogOrders.push(
                { id: 'ORD-S1', clientName: '台電強韌電網變壓器', totalQty: scale * 100, remQty: scale * 80, pricePerUnit: 50000, costPerUnit: 18000, daysLeft: 60, dailyPenalty: 10000, isExport: false },
                { id: 'ORD-S2', clientName: '美國 AI 資料中心特急件', totalQty: scale * 50, remQty: scale * 50, pricePerUnit: 52000, costPerUnit: 18000, daysLeft: 45, dailyPenalty: 25000, isExport: true }
            );
        }
        
        // C2. 氣體絕緣開關與微電網整合商 (gis_microgrid)
        else if (corp.bizModel === 'gis_microgrid') {
            state.bessCapacity = 8 + scale * 1;
            state.emsEfficiencyLvl = 2;
            state.gridProjects.push({
                id: 'PROJ-S1',
                name: '台電 345KV 氣體絕緣變電所',
                totalValue: scale * 12000000,
                duration: 90,
                daysLeft: 60,
                progress: 33
            });
        }
        
        // D1. 綠能發電與售電公用事業 (utility_ppa)
        else if (corp.bizModel === 'utility_ppa') {
            // 分配 3 個運作中的電廠
            state.projects.push(
                { id: 'P-S1', name: '台南鹽田太陽能光電區', phase: 'om', progress: 100, capExNeeded: 80000000, financeLeverage: 0.8, dailyMaintenance: scale * 8000, dailyRentRev: scale * 25000, ppaType: 'fit', cppaPremium: 0 },
                { id: 'P-S2', name: '苗栗後龍風力發電機群', phase: 'om', progress: 100, capExNeeded: 150000000, financeLeverage: 0.85, dailyMaintenance: scale * 15000, dailyRentRev: scale * 48000, ppaType: 'fit', cppaPremium: 0 }
            );
            if (['NEE', '6806'].includes(corp.id)) { // NEE, 森崴
                // 額外擁有 CPPA 高價電廠
                state.projects.push({
                    id: 'P-S3',
                    name: '彰化外海一期離岸風場',
                    phase: 'om',
                    progress: 100,
                    capExNeeded: 350000000,
                    financeLeverage: 0.9,
                    dailyMaintenance: scale * 30000,
                    dailyRentRev: scale * 90000,
                    ppaType: 'cppa',
                    cppaPremium: scale * 35000
                });
            }
        }
        
        // D2. 風電水下基礎與材料製造商 (wind_materials)
        else if (corp.bizModel === 'wind_materials') {
            state.capacity = 3 + scale * 1;
            state.weldingQualityLvl = 2;
            if (['9958'].includes(corp.id)) { // 世紀鋼
                state.weldingQualityLvl = 3;
                state.jacketProjects.push({
                    id: 'W-S1',
                    name: '沃旭大彰化風場 Jacket 水下基礎工程',
                    contractValue: scale * 150000000,
                    capExNeeded: scale * 80000000,
                    progress: 40,
                    phase: 'epc',
                    isCompleted: false
                });
            }
        }
    },

    // ==========================================
    // 2. UI 渲染派發 (Render)
    // ==========================================
    renderEnergyTab(corp, contentArea, isReadOnly) {
        if (!corp.energyState) this.initAssets(corp);
        
        // 確保全域變數安全
        if (typeof app !== 'undefined' && app.state) {
            if (!app.state.oilPrice) app.state.oilPrice = 80.0;
            if (!app.state.prevOilPrice) app.state.prevOilPrice = 80.0;
            if (!app.state.carbonTaxRate) app.state.carbonTaxRate = 300.0;
        }

        let html = `<div class="p-4 bg-black border border-gray-800 rounded crt text-gray-200">`;
        
        // 國際能源物價與碳稅費指標橫幅 (WOW 視覺設計)
        let oilPrice = (app.state && app.state.oilPrice) ? app.state.oilPrice : 80.0;
        let carbonTax = (app.state && app.state.carbonTaxRate) ? app.state.carbonTaxRate : 300.0;
        
        let oilColor = oilPrice >= 110 ? 'text-red-400 font-bold animate-pulse' : (oilPrice <= 55 ? 'text-green-400 font-bold' : 'text-amber-400 font-mono');
        let taxColor = carbonTax >= 600 ? 'text-purple-400 font-bold animate-pulse' : 'text-cyan-400 font-mono';

        html += `<div class="mb-4 text-xs bg-gray-900 bg-opacity-95 p-3 rounded border border-gray-800 flex justify-between items-center shadow-[inset_0_0_12px_rgba(255,165,0,0.08)]">
            <div>🛢️ 國際原油價格: <span class="${oilColor}">$${oilPrice.toFixed(2)} USD/桶</span></div>
            <div>🏭 全球排碳稅率: <span class="${taxColor}">$${carbonTax.toFixed(0)} TWD/噸</span></div>
            <div class="text-xs text-gray-400 hidden lg:block">※ 能源價格連動航運、汽車與建材成本；碳稅率直接打擊高碳排大戶！</div>
        </div>`;

        // 國家重大重工業減碳補助（保護初創與上市前三個月）
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstQuarterSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        if (isFirstQuarterSubsidized) {
            html += `<div class="mb-4 text-xs bg-cyan-950 bg-opacity-30 p-3 rounded border border-cyan-800 text-cyan-400 flex flex-col gap-1 shadow-[0_0_15px_rgba(0,191,255,0.1)]">
                <div class="font-bold flex items-center gap-1.5 font-sans">🛡️ 國家重工業低碳轉型與強韌電網保駕條例 (新創期護航)</div>
                <div class="text-xs text-gray-300">※ 享有：每日固定維護折舊成本及員工行政開銷免除 40% 的優惠津貼。</div>
                <div class="text-xs text-gray-300">※ 享有：所有低碳研發 (R&D) 與碳捕捉設備 (CapEx) 升級支出全面補貼 15%。</div>
            </div>`;
        }

        // ==========================================
        // 兩步驟抉擇介面：玩家大方向抉擇 (FOUNDING 抉擇大卡片)
        // ==========================================
        if (corp.bizModel === 'carbon_emitters') {
            html += this.renderCarbonEmittersSelector(corp, isReadOnly);
        } else if (corp.bizModel === 'electrification') {
            html += this.renderElectrificationSelector(corp, isReadOnly);
        } 
        
        // ==========================================
        // 八大客製化子商業模型 UI 分流
        // ==========================================
        else if (corp.bizModel === 'refinery_cracking') {
            html += this.renderRefineryUI(corp, isReadOnly);
        } else if (corp.bizModel === 'polymers_fibers') {
            html += this.renderPolymersUI(corp, isReadOnly);
        } else if (corp.bizModel === 'cement_kiln') {
            html += this.renderCementUI(corp, isReadOnly);
        } else if (corp.bizModel === 'steel_furnace') {
            html += this.renderSteelUI(corp, isReadOnly);
        } else if (corp.bizModel === 'transformer_grid') {
            html += this.renderTransformerUI(corp, isReadOnly);
        } else if (corp.bizModel === 'gis_microgrid') {
            html += this.renderGisUI(corp, isReadOnly);
        } else if (corp.bizModel === 'utility_ppa') {
            html += this.renderUtilityUI(corp, isReadOnly);
        } else if (corp.bizModel === 'wind_materials') {
            html += this.renderWindUI(corp, isReadOnly);
        }

        html += `</div>`;
        contentArea.innerHTML = html;
    },

    // ==========================================
    // 3. 子抉擇器渲染 (Selectors)
    // ==========================================
    renderCarbonEmittersSelector(corp, isReadOnly) {
        if (isReadOnly) return `<div class="p-6 text-center text-gray-400">觀察員模式下無法選擇商業模型。</div>`;
        return `
            <div class="p-6 bg-gray-900 bg-opacity-60 border border-gray-800 rounded text-center">
                <h3 class="text-amber-400 font-bold text-lg mb-2">🏭 舊時代的碳排巨獸 (Carbon Emitters)</h3>
                <p class="text-sm text-gray-400 mb-6">您的企業屬於傳統重工業。請點擊選擇以下四種專屬實體製造模型之一，一旦決定後將無法變更：</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="p-4 bg-black border border-gray-800 hover:border-amber-500 rounded text-left transition duration-200 cursor-pointer flex flex-col justify-between" onclick="CEO_ENERGY.selectModel('${corp.id}', 'refinery_cracking')">
                        <div>
                            <h4 class="text-white font-bold text-sm mb-1.5">🛢️ A1. 輕油裂解與煉油廠</h4>
                            <p class="text-xs text-gray-400 leading-relaxed">買進低價原油/輕油進行提煉裂解，賣出高價乙烯、丙烯或燃油。極度考驗原油在途庫存跌價避險能力，獲利隨裂解價差暴漲暴跌，利潤的煉金術！</p>
                        </div>
                        <span class="mt-4 text-xs text-amber-400 font-bold block text-right">💡 點擊成立該企業 ➔</span>
                    </div>
                    <div class="p-4 bg-black border border-gray-800 hover:border-amber-500 rounded text-left transition duration-200 cursor-pointer flex flex-col justify-between" onclick="CEO_ENERGY.selectModel('${corp.id}', 'polymers_fibers')">
                        <div>
                            <h4 class="text-white font-bold text-sm mb-1.5">紡 A2. 聚合物與塑膠纖維廠</h4>
                            <p class="text-xs text-gray-400 leading-relaxed">購買基礎石化原料加工，生產 PVC/PE/PP 塑膠顆粒與機能纖維。利潤來自原料與成品的「加工利差」，與裂解廠對立，可升級 PCR 再生料免除原料成本！</p>
                        </div>
                        <span class="mt-4 text-xs text-amber-400 font-bold block text-right">💡 點擊成立該企業 ➔</span>
                    </div>
                    <div class="p-4 bg-black border border-gray-800 hover:border-amber-500 rounded text-left transition duration-200 cursor-pointer flex flex-col justify-between" onclick="CEO_ENERGY.selectModel('${corp.id}', 'cement_kiln')">
                        <div>
                            <h4 class="text-white font-bold text-sm mb-1.5">窯 B1. 水泥製造廠</h4>
                            <p class="text-xs text-gray-400 leading-relaxed">石灰石與焦煤經旋窯高溫煆燒製成水泥。煤炭價格直接決定利潤。高爐點火/熄火重啟費用天價，考驗你在房地產蕭條時的庫存去化與窯爐維持能力！</p>
                        </div>
                        <span class="mt-4 text-xs text-amber-400 font-bold block text-right">💡 點擊成立該企業 ➔</span>
                    </div>
                    <div class="p-4 bg-black border border-gray-800 hover:border-amber-500 rounded text-left transition duration-200 cursor-pointer flex flex-col justify-between" onclick="CEO_ENERGY.selectModel('${corp.id}', 'steel_furnace')">
                        <div>
                            <h4 class="text-white font-bold text-sm mb-1.5">⚡ B2. 鋼鐵冶煉廠</h4>
                            <p class="text-xs text-gray-400 leading-relaxed">高爐（焦煤鐵砂，排碳超高成本低）與電爐（廢鋼電力，排碳低受電費波及）雙軌工藝調配。可投資高額「氫能冶金技術」生產高溢價零碳綠鋼！</p>
                        </div>
                        <span class="mt-4 text-xs text-amber-400 font-bold block text-right">💡 點擊成立該企業 ➔</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderElectrificationSelector(corp, isReadOnly) {
        if (isReadOnly) return `<div class="p-6 text-center text-gray-400">觀察員模式下無法選擇商業模型。</div>`;
        return `
            <div class="p-6 bg-gray-900 bg-opacity-60 border border-gray-800 rounded text-center">
                <h3 class="text-cyan-400 font-bold text-lg mb-2">⚡ 新時代的電氣化救星 (The Electrification)</h3>
                <p class="text-sm text-gray-400 mb-6">您的企業屬於綠色新動能板塊。請點擊選擇以下四種專屬電氣化模型之一，一旦決定後將無法變更：</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="p-4 bg-black border border-gray-800 hover:border-cyan-500 rounded text-left transition duration-200 cursor-pointer flex flex-col justify-between" onclick="CEO_ENERGY.selectModel('${corp.id}', 'transformer_grid')">
                        <div>
                            <h4 class="text-white font-bold text-sm mb-1.5">🔌 C1. 高壓變壓器與電網設備廠</h4>
                            <p class="text-xs text-gray-400 leading-relaxed">繞線製造特高壓變壓器。供不應求，受制於繞線師傅工人數與產能，逾期面臨違約金罰款。砸大錢取得「北美安規認證」後可解鎖 2.5 倍天價外銷美國市場！</p>
                        </div>
                        <span class="mt-4 text-xs text-cyan-400 font-bold block text-right">💡 點擊成立該企業 ➔</span>
                    </div>
                    <div class="p-4 bg-black border border-gray-800 hover:border-cyan-500 rounded text-left transition duration-200 cursor-pointer flex flex-col justify-between" onclick="CEO_ENERGY.selectModel('${corp.id}', 'gis_microgrid')">
                        <div>
                            <h4 class="text-white font-bold text-sm mb-1.5">🖧 C2. 氣體絕緣開關與微電網整合商</h4>
                            <p class="text-xs text-gray-400 leading-relaxed">研發氣體絕緣開關 (GIS) 與微電網儲能系統。專注競標國家電網強韌標案，當停電/跳電危機觸發時，儲能急單會排山倒海般湧入，獲利翻倍！</p>
                        </div>
                        <span class="mt-4 text-xs text-cyan-400 font-bold block text-right">💡 點擊成立該企業 ➔</span>
                    </div>
                    <div class="p-4 bg-black border border-gray-800 hover:border-cyan-500 rounded text-left transition duration-200 cursor-pointer flex flex-col justify-between" onclick="CEO_ENERGY.selectModel('${corp.id}', 'utility_ppa')">
                        <div>
                            <h4 class="text-white font-bold text-sm mb-1.5">🍃 D1. 綠能發電與售電公用事業</h4>
                            <p class="text-xs text-gray-400 leading-relaxed">投資百億元建設太陽能或大型離岸風場。商轉完工後以綠電 FiT 售電合約穩定收租，或與台積電、Google 簽署高價企業綠電 CPPA 協議賺取暴利！</p>
                        </div>
                        <span class="mt-4 text-xs text-cyan-400 font-bold block text-right">💡 點擊成立該企業 ➔</span>
                    </div>
                    <div class="p-4 bg-black border border-gray-800 hover:border-cyan-500 rounded text-left transition duration-200 cursor-pointer flex flex-col justify-between" onclick="CEO_ENERGY.selectModel('${corp.id}', 'wind_materials')">
                        <div>
                            <h4 class="text-white font-bold text-sm mb-1.5">🏗️ D2. 風電水下基礎與材料製造商</h4>
                            <p class="text-xs text-gray-400 leading-relaxed">重型鋼構焊接生產離岸風電水下 Jacket 套管基礎。高度消耗資金（高達 80%~90% 的財務槓桿），良率與準時交貨是獲利關鍵，受惠於國產化特許保護牆。</p>
                        </div>
                        <span class="mt-4 text-xs text-cyan-400 font-bold block text-right">💡 點擊成立該企業 ➔</span>
                    </div>
                </div>
            </div>
        `;
    },

    selectModel(corpId, bizModel) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp) return;

        corp.bizModel = bizModel;
        this.initAssets(corp);
        
        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【大政方針】董事會一致通過，企業正式轉型為專屬子業務模型：「${this.getModelChineseName(bizModel)}」，全面展開重工業運作！`,
            isGood: true
        });

        app.log(`【轉型啟航】${corp.name} 已正式轉型為「${this.getModelChineseName(bizModel)}」！`, 'text-cyan-400 font-bold');
        app.updateUI();
    },

    getModelChineseName(model) {
        const mapping = {
            refinery_cracking: '輕油裂解與煉油廠',
            polymers_fibers: '聚合物與塑膠纖維廠',
            cement_kiln: '水泥製造廠',
            steel_furnace: '鋼鐵冶煉廠',
            transformer_grid: '高壓變壓器與電網設備廠',
            gis_microgrid: '氣體絕緣開關與微電網整合商',
            utility_ppa: '綠能發電與售電公用事業',
            wind_materials: '風電水下基礎與材料製造商'
        };
        return mapping[model] || model;
    },

    // ==========================================
    // 4. UI 模組細部渲染 (Sub-UI)
    // ==========================================
    
    // A1. 輕油裂解與煉油廠 UI
    renderRefineryUI(corp, isReadOnly) {
        const state = corp.energyState;
        const disabled = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';
        
        let refinedProductPrice = (app.state.oilPrice * 1.35).toFixed(2);
        let spread = (app.state.oilPrice * 0.35).toFixed(2);

        let html = `<h3 class="text-amber-400 font-bold mb-2 text-sm flex items-center gap-1">🛢️ 輕油裂解與煉油廠 (Refinery & Olefins Cracking)</h3>`;
        html += `<p class="text-xs text-gray-400 mb-4">輕油裂解是石化產業最上游。買進原油，提煉成基礎石化成品（乙烯、丙烯等）或汽柴油售出。極度考驗原油在途庫存跌價避險能力。當原油崩盤或裂解價差為負，請立即啟動「歲修停機」！</p>`;

        // A. 裂解數據狀態
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">每日加工產能</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">${state.capacity.toLocaleString()} 桶/日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">國際原油進價</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">$${app.state.oilPrice.toFixed(2)} USD</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">乙烯/燃油成品售價</div>
                <div class="text-green-400 font-mono font-bold mt-0.5">$${refinedProductPrice} USD</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">目前預估裂解利差</div>
                <div class="text-cyan font-mono font-bold mt-0.5">+$${spread} USD/桶</div>
            </div>
        </div>`;

        // B. 經營面板操作
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2">
                <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">⚙️ 產能與歲修調度</div>
                <div class="flex justify-between items-center text-gray-400">
                    <span>歲修停機狀態:</span>
                    <span class="font-bold ${state.maintenanceMode ? 'text-red-400' : 'text-green-400'}">${state.maintenanceMode ? '🔴 歲修停機中' : '🟢 正常開機生產'}</span>
                </div>
                <div class="flex justify-between items-center text-gray-400">
                    <span>當前產能稼動率:</span>
                    <span class="font-bold text-amber-400 font-mono">${state.maintenanceMode ? 0 : state.utilization}%</span>
                </div>
                <input type="range" min="20" max="100" step="5" value="${state.utilization}" class="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500" onchange="CEO_ENERGY.setVal('${corp.id}', 'utilization', this.value)" ${state.maintenanceMode ? 'disabled' : ''} ${disabled}>
                <button class="w-full mt-2 py-1.5 rounded font-bold ${state.maintenanceMode ? 'bg-green-900 hover:bg-green-800 text-white' : 'bg-red-900 hover:bg-red-800 text-white'} ${disabledClass}" onclick="CEO_ENERGY.toggleMaintenance('${corp.id}')" ${disabled}>
                    ${state.maintenanceMode ? '⚡ 結束歲修 · 重啟開機' : '🔧 啟動全廠停機歲修'}
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2">
                <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">🌱 碳捕捉與 ESG 減碳系統</div>
                <div class="flex justify-between items-center text-gray-400">
                    <span>系統投資等級:</span>
                    <span class="font-bold text-cyan-400">Lvl ${state.carbonCaptureLvl}</span>
                </div>
                <div class="flex justify-between items-center text-gray-400">
                    <span>排碳捕捉率:</span>
                    <span class="font-bold text-cyan-400 font-mono">${(state.carbonCaptureRate * 100).toFixed(0)}%</span>
                </div>
                <p class="text-[10px] text-gray-500">※ 碳捕捉能有效折抵每日碳稅罰金。捕捉率上限為 90%。</p>
                <button class="w-full mt-2 py-1.5 bg-cyan-900 hover:bg-cyan-800 text-white font-bold rounded ${state.carbonCaptureRate >= 0.9 ? 'opacity-50 cursor-not-allowed' : ''} ${disabledClass}" onclick="CEO_ENERGY.upgradeCarbonCapture('${corp.id}')" ${state.carbonCaptureRate >= 0.9 ? 'disabled' : ''} ${disabled}>
                    ${state.carbonCaptureRate >= 0.9 ? '🥇 已達捕捉上限 (90%)' : `🏗️ 投資升級系統 (TWD $10,000,000)`}
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">⚖️ 裂解日盈虧試算</div>
                    <div class="mt-2 space-y-1 text-[11px] text-gray-400">
                        <div class="flex justify-between"><span>每日產品營收:</span><span class="text-green-400 font-mono">+$${app.formatMoney((state.maintenanceMode ? 0 : state.capacity * (state.utilization / 100) * 1.35 * app.state.oilPrice * 30))}</span></div>
                        <div class="flex justify-between"><span>原油原料進價:</span><span class="text-red-400 font-mono">-$${app.formatMoney((state.maintenanceMode ? 0 : state.capacity * (state.utilization / 100) * app.state.oilPrice * 30))}</span></div>
                        <div class="flex justify-between"><span>預估排碳費扣:</span><span class="text-purple-400 font-mono">-$${app.formatMoney((state.maintenanceMode ? 0 : state.capacity * (state.utilization / 100) * 0.1 * (1 - state.carbonCaptureRate) * app.state.carbonTaxRate))}</span></div>
                        <div class="flex justify-between"><span>固定折舊管銷:</span><span class="text-gray-400 font-mono">-$${app.formatMoney((state.maintenanceMode ? state.capacity * 15 : state.capacity * 30))}</span></div>
                    </div>
                </div>
                <div class="border-t border-gray-800 pt-2 flex justify-between text-xs font-bold">
                    <span>單日預估淨利:</span>
                    <span class="${(state.maintenanceMode ? (state.capacity * -15) : (state.capacity * (state.utilization / 100) * (0.35 * app.state.oilPrice * 30 - 0.1 * (1 - state.carbonCaptureRate) * app.state.carbonTaxRate) - state.capacity * 30)) >= 0 ? 'text-green-400' : 'text-red-400'} font-mono">
                        TWD $${app.formatMoney((state.maintenanceMode ? (state.capacity * -15) : (state.capacity * (state.utilization / 100) * (0.35 * app.state.oilPrice * 30 - 0.1 * (1 - state.carbonCaptureRate) * app.state.carbonTaxRate) - state.capacity * 30)))}
                    </span>
                </div>
            </div>
        </div>`;

        return html;
    },

    // A2. 聚合物與塑膠纖維廠 UI
    renderPolymersUI(corp, isReadOnly) {
        const state = corp.energyState;
        const disabled = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let ethPrice = (app.state.oilPrice * 1.15 * 30).toFixed(0); // 乙烯價/噸
        let gpPrice = (ethPrice * 1.25).toFixed(0);
        let pfPrice = (ethPrice * 1.75 * (1 + state.advancedMaterialRndLvl * 0.05)).toFixed(0);

        let html = `<h3 class="text-amber-400 font-bold mb-2 text-sm flex items-center gap-1">紡 聚合物與塑膠纖維廠 (Polymers & Synthetic Fibers)</h3>`;
        html += `<p class="text-xs text-gray-400 mb-4">買進上游乙烯進行化學加工，合成為 PVC 粒子或高端機能/防彈纖維售出。利潤受制於「原料進價與成品加工利差」。如果乙烯原料飆漲而下游消費低迷，加工利差會被極度壓縮，此時可升級 PCR 再生料降低原料成本！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">每日加工產能</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">${state.capacity.toLocaleString()} 噸/日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">原料乙烯採購價</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">TWD $${app.formatMoney(Number(ethPrice))} /噸</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">機能纖維售價</div>
                <div class="text-green-400 font-mono font-bold mt-0.5">TWD $${app.formatMoney(Number(pfPrice))} /噸</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">通用 PVC 顆粒售價</div>
                <div class="text-green-400 font-mono font-bold mt-0.5">TWD $${app.formatMoney(Number(gpPrice))} /噸</div>
            </div>
        </div>`;

        // B. 操作
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2">
                <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">📊 產品結構配比調配</div>
                <div class="flex justify-between items-center text-gray-400">
                    <span>高端機能纖維佔比:</span>
                    <span class="font-bold text-amber-400 font-mono">${state.productMixPct}%</span>
                </div>
                <div class="flex justify-between items-center text-gray-400">
                    <span>通用 PVC 顆粒佔比:</span>
                    <span class="font-bold text-cyan-400 font-mono">${100 - state.productMixPct}%</span>
                </div>
                <input type="range" min="0" max="100" step="5" value="${state.productMixPct}" class="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500" onchange="CEO_ENERGY.setVal('${corp.id}', 'productMixPct', this.value)" ${disabled}>
                <p class="text-[10px] text-gray-500">※ 高端纖維毛利率高但受限於銷量景氣，通用 PVC 走量但利潤微薄。</p>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">🔬 高端機能材料研發 (R&D)</div>
                    <div class="flex justify-between items-center text-gray-400 mt-1">
                        <span>機能研發等級:</span>
                        <span class="font-bold text-green-400">Lvl ${state.advancedMaterialRndLvl}</span>
                    </div>
                    <div class="flex justify-between items-center text-gray-400">
                        <span>機能纖維售價加成:</span>
                        <span class="font-bold text-green-400 font-mono">+${state.advancedMaterialRndLvl * 5}%</span>
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 bg-green-900 hover:bg-green-800 text-white font-bold rounded ${disabledClass}" onclick="CEO_ENERGY.upgradeAdvancedMaterials('${corp.id}')" ${disabled}>
                    🧪 研發機能材料 (TWD $8,000,000)
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">♻️ 再生塑膠循環系統 (PCR)</div>
                    <div class="flex justify-between items-center text-gray-400 mt-1">
                        <span>循環系統狀態:</span>
                        <span class="font-bold ${state.pcrRecycleEnabled ? 'text-green-400' : 'text-red-400'}">${state.pcrRecycleEnabled ? '🟢 循環中' : '🔴 未建置'}</span>
                    </div>
                    <div class="text-[10px] text-gray-500 leading-relaxed">
                        ※ 建置後，以回收料替代 20% 原生乙烯，原料成本永久降低 15%，享有 10% 綠色售價溢價，並減免 20% 碳排罰金！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 rounded font-bold ${state.pcrRecycleEnabled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-cyan-900 hover:bg-cyan-800 text-white'} ${disabledClass}" onclick="CEO_ENERGY.enablePcr('${corp.id}')" ${state.pcrRecycleEnabled ? 'disabled' : ''} ${disabled}>
                    ${state.pcrRecycleEnabled ? '🥇 循環回收系統運轉中' : '🏗️ 建置循環再生系統 ($15,000,000)'}
                </button>
            </div>
        </div>`;

        return html;
    },

    // B1. 水泥製造廠 UI
    renderCementUI(corp, isReadOnly) {
        const state = corp.energyState;
        const disabled = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';
        
        let coalPrice = (app.state.oilPrice / 2) * 30; // 煤炭價格
        let steelPrice = 1500 * (1 + state.greenPremiumPct / 100);

        let html = `<h3 class="text-amber-400 font-bold mb-2 text-sm flex items-center gap-1">窯 水泥製造廠 (Cement Rotary Kiln)</h3>`;
        html += `<p class="text-xs text-gray-400 mb-4">高溫旋窯煅燒石灰石與焦煤成熟料製成水泥。煤炭能耗與碳費是兩大成本殺手。旋窯一旦熄火需要支付 $3,000,000 天價點火費。當房地產低迷建材滯銷時，考驗你的資金與庫存調度！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">旋窯煅燒狀態</div>
                <div class="font-bold mt-0.5 ${state.isFurnaceOn ? 'text-green-400 animate-pulse' : 'text-red-400'}">${state.isFurnaceOn ? '🔥 窯爐點火運轉中' : '❄️ 窯爐已熄火休眠'}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">焦煤採購報價</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">TWD $${app.formatMoney(Number(coalPrice.toFixed(0)))} /噸</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">水泥庫存水位</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">${state.inventory.toLocaleString()} 噸</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">水泥售價 (含溢價)</div>
                <div class="text-green-400 font-mono font-bold mt-0.5">TWD $${steelPrice.toFixed(0)} /噸</div>
            </div>
        </div>`;

        // B. 操作
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">🔥 窯爐點火與重啟控制</div>
                    <div class="text-[11px] text-gray-400 leading-relaxed mt-1">
                        高溫旋窯若熄火，每日折舊仍需支付，但能避免每日焦煤能耗支出與庫存積壓；重新點火需支付 $3,000,000。
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 rounded font-bold ${state.isFurnaceOn ? 'bg-red-900 hover:bg-red-800 text-white' : 'bg-green-900 hover:bg-green-800 text-white'} ${disabledClass}" onclick="CEO_ENERGY.toggleFurnace('${corp.id}')" ${disabled}>
                    ${state.isFurnaceOn ? '❄️ 窯爐緊急安全熄火' : '🔥 重啟點火 (TWD $3,000,000)'}
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">🪵 協同廢棄物處理 (替代燃料)</div>
                    <div class="flex justify-between items-center text-gray-400 mt-1">
                        <span>替代燃料系統:</span>
                        <span class="font-bold ${state.coProcessingEnabled ? 'text-green-400' : 'text-red-400'}">${state.coProcessingEnabled ? '🟢 已建置啟用' : '🔴 未建置'}</span>
                    </div>
                    <div class="text-[10px] text-gray-500 leading-relaxed">
                        ※ 協同處理污泥與廢輪胎代替 20% 煤炭。永久降低 20% 煤炭成本，並每日獲得政府協同處理補貼！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 rounded font-bold ${state.coProcessingEnabled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-cyan-900 hover:bg-cyan-800 text-white'} ${disabledClass}" onclick="CEO_ENERGY.enableCoProcessing('${corp.id}')" ${state.coProcessingEnabled ? 'disabled' : ''} ${disabled}>
                    ${state.coProcessingEnabled ? '🥇 協同處理系統運行中' : '🏗️ 改造窯爐協同處理 ($15,000,000)'}
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">🧱 超低碳煅燒黏土水泥研發</div>
                    <div class="flex justify-between items-center text-gray-400 mt-1">
                        <span>低碳水泥系統:</span>
                        <span class="font-bold ${state.lowCarbonCementEnabled ? 'text-green-400' : 'text-red-400'}">${state.lowCarbonCementEnabled ? '🟢 已研發量產' : '🔴 未研發'}</span>
                    </div>
                    <div class="text-[10px] text-gray-500 leading-relaxed font-sans">
                        ※ 研發後，生產過程碳排放大幅降低 60%，永久免除 60% 碳費，並享有 15% 的高額低碳綠色產品定價溢價！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 rounded font-bold ${state.lowCarbonCementEnabled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-green-900 hover:bg-green-800 text-white'} ${disabledClass}" onclick="CEO_ENERGY.enableLowCarbonCement('${corp.id}')" ${state.lowCarbonCementEnabled ? 'disabled' : ''} ${disabled}>
                    ${state.lowCarbonCementEnabled ? '🥇 低碳水泥已解鎖量產' : '🔬 研發低碳技術 (TWD $25,000,000)'}
                </button>
            </div>
        </div>`;

        return html;
    },

    // B2. 鋼鐵冶煉廠 UI
    renderSteelUI(corp, isReadOnly) {
        const state = corp.energyState;
        const disabled = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let blastCost = (1200 + app.state.oilPrice * 2.5).toFixed(0);
        let electricCost = (2500 + app.state.oilPrice * 1.5).toFixed(0);
        let steelPrice = 18000;
        if (state.hydrogenSteelmakingEnabled) {
            steelPrice *= 1.40;
        }

        let html = `<h3 class="text-amber-400 font-bold mb-2 text-sm flex items-center gap-1">⚡ 鋼鐵冶煉廠 (Steel Blast Furnace)</h3>`;
        html += `<p class="text-xs text-gray-400 mb-4">鋼鐵是工業與營建的骨骼。可手動分配高爐（焦煤鐵砂，排碳高成本極低）與電弧爐（廢鋼電力，排碳少但成本高受電價波及）冶煉比例，或研發氫能冶金以生產零碳綠鋼！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">高爐運行狀態</div>
                <div class="font-bold mt-0.5 ${state.isFurnaceOn ? 'text-green-400 animate-pulse' : 'text-red-400'}">${state.isFurnaceOn ? '🔥 高爐正常點火生產' : '❄️ 高爐熄火休眠'}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">高爐熔煉成本</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">TWD $${app.formatMoney(Number(blastCost))} /噸</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">電爐熔煉成本</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">TWD $${app.formatMoney(Number(electricCost))} /噸</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">鋼材市場售價</div>
                <div class="text-green-400 font-mono font-bold mt-0.5">TWD $${app.formatMoney(steelPrice)} /噸</div>
            </div>
        </div>`;

        // B. 操作
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2">
                <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">⚖️ 冶煉工藝雙軌配比</div>
                <div class="flex justify-between items-center text-gray-400">
                    <span>高爐冶煉比重 (焦煤+鐵礦):</span>
                    <span class="font-bold text-amber-400 font-mono">${state.processMixPct}%</span>
                </div>
                <div class="flex justify-between items-center text-gray-400">
                    <span>電爐冶煉比重 (廢鋼+電力):</span>
                    <span class="font-bold text-cyan-400 font-mono">${100 - state.processMixPct}%</span>
                </div>
                <input type="range" min="0" max="100" step="5" value="${state.processMixPct}" class="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500" onchange="CEO_ENERGY.setVal('${corp.id}', 'processMixPct', this.value)" ${disabled}>
                <p class="text-[10px] text-gray-500">※ 高爐每噸排碳 1.8 噸，電爐排碳 0.4 噸。碳稅費重時，電爐優勢大增。</p>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">❄️ 高爐安全管理與熄火</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1 font-sans">
                        高爐若因鋼市極度蕭條、鋼材爆倉而熄火，能完全停止高爐原料消耗；但重新點火需支付 $4,000,000 天價代價！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 rounded font-bold ${state.isFurnaceOn ? 'bg-red-900 hover:bg-red-800 text-white' : 'bg-green-900 hover:bg-green-800 text-white'} ${disabledClass}" onclick="CEO_ENERGY.toggleSteelFurnace('${corp.id}')" ${disabled}>
                    ${state.isFurnaceOn ? '❄️ 熄火停機' : '🔥 重啟點火 (TWD $4,000,000)'}
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-amber-400 pl-1.5">🍃 氫能冶金突破 (無碳綠鋼)</div>
                    <div class="flex justify-between items-center text-gray-400 mt-1">
                        <span>氫能冶金技術:</span>
                        <span class="font-bold ${state.hydrogenSteelmakingEnabled ? 'text-green-400' : 'text-red-400'}">${state.hydrogenSteelmakingEnabled ? '🟢 已導入量產' : '🔴 未研發'}</span>
                    </div>
                    <div class="text-[10px] text-gray-500 leading-relaxed font-sans">
                        ※ 以綠氫代替焦煤還原鐵礦砂。高爐直接切換為完全零碳排生產，免徵所有碳稅費，並享有 40% 的綠鋼售價溢價！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 rounded font-bold ${state.hydrogenSteelmakingEnabled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-green-900 hover:bg-green-800 text-white'} ${disabledClass}" onclick="CEO_ENERGY.enableHydrogenSteel('${corp.id}')" ${state.hydrogenSteelmakingEnabled ? 'disabled' : ''} ${disabled}>
                    ${state.hydrogenSteelmakingEnabled ? '🥇 氫能無碳綠鋼運轉中' : '🔬 研發氫能冶金 (TWD $40,000,000)'}
                </button>
            </div>
        </div>`;

        return html;
    },

    // C1. 高壓變壓器與電網設備廠 UI
    renderTransformerUI(corp, isReadOnly) {
        const state = corp.energyState;
        const disabled = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let shiftText = state.workersShift === 3 ? '三班全天運轉' : (state.workersShift === 2 ? '兩班輪番加班' : '正常單班正常');
        let shiftMult = state.workersShift === 3 ? 1.6 : (state.workersShift === 2 ? 1.3 : 1.0);

        let html = `<h3 class="text-cyan-400 font-bold mb-2 text-sm flex items-center gap-1 font-sans">🔌 高壓變壓器與電網設備廠 (Transformers & Grid Equipment)</h3>`;
        html += `<p class="text-xs text-gray-400 mb-4">電網與 AI 資料中心賣水人。B2B 長約訂單爆倉！獲利高度受制於「變壓器繞線師傅與繞線機台產能」。取得北美認證後，可將特高壓變壓器以 2.5 倍高溢價外銷美國！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">變壓器基礎繞線產能</div>
                <div class="text-cyan-400 font-mono font-bold mt-0.5">${state.capacity.toLocaleString()} 台/日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">班制生產調度 (產能加成)</div>
                <div class="text-cyan-400 font-bold mt-0.5">${shiftText} (${(shiftMult * 100).toFixed(0)}%)</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">北美安規外銷認證</div>
                <div class="font-bold mt-0.5 ${state.usCertification ? 'text-green-400' : 'text-red-400'}">${state.usCertification ? '🟢 已取得認證 (2.5倍高毛利)' : '🔴 未取得外銷認證'}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">在手排隊訂單總量</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">${state.backlogOrders.reduce((sum, o) => sum + o.remQty, 0)} 台</div>
            </div>
        </div>`;

        // B. 操作
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2">
                <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">🏭 廠房擴建與班制加班</div>
                <div class="flex justify-between items-center text-gray-400 mt-1">
                    <span>廠房擴建狀態:</span>
                    <span class="font-bold text-yellow font-mono">${state.expansionDaysLeft > 0 ? `🏗️ 擴建中 (剩 ${state.expansionDaysLeft} 天)` : '🟢 正常無閒置'}</span>
                </div>
                <button class="w-full py-1 bg-cyan-900 hover:bg-cyan-800 text-white font-bold rounded ${state.expansionDaysLeft > 0 ? 'opacity-50 cursor-not-allowed' : ''} ${disabledClass}" onclick="CEO_ENERGY.expandTransformerGrid('${corp.id}')" ${state.expansionDaysLeft > 0 ? 'disabled' : ''} ${disabled}>
                    🏗️ 擴建繞線生產線 (TWD $15,000,000)
                </button>
                <div class="border-t border-gray-800 pt-2 space-y-1">
                    <span class="text-gray-400">班制加班調度:</span>
                    <div class="grid grid-cols-3 gap-1">
                        <button class="py-1 rounded font-bold ${state.workersShift === 1 ? 'bg-cyan-600 text-black' : 'bg-gray-900 text-gray-400'} ${disabledClass}" onclick="CEO_ENERGY.setShift('${corp.id}', 1)" ${disabled}>單班</button>
                        <button class="py-1 rounded font-bold ${state.workersShift === 2 ? 'bg-cyan-600 text-black' : 'bg-gray-900 text-gray-400'} ${disabledClass}" onclick="CEO_ENERGY.setShift('${corp.id}', 2)" ${disabled}>雙班</button>
                        <button class="py-1 rounded font-bold ${state.workersShift === 3 ? 'bg-cyan-600 text-black' : 'bg-gray-900 text-gray-400'} ${disabledClass}" onclick="CEO_ENERGY.setShift('${corp.id}', 3)" ${disabled}>三班</button>
                    </div>
                </div>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">🇺🇸 北美安規認證 (特高壓變壓器)</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1 font-sans">
                        取得後，出貨給美國電網與資料中心的訂單，出貨結算價格可暴增至 **2.5 倍** 的超級天價！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 rounded font-bold ${state.usCertification ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-green-900 hover:bg-green-800 text-white'} ${disabledClass}" onclick="CEO_ENERGY.applyUsCert('${corp.id}')" ${state.usCertification ? 'disabled' : ''} ${disabled}>
                    ${state.usCertification ? '🥇 已通過北美安規認證' : '🔬 申請北美認證 (TWD $30,000,000)'}
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">📢 B2B 電網長約新訂單</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1">
                        繞線產能是你的極限！每天會有 5% 機率湧入新訂單。玩家也可在此主動申請一份新訂單塞入訂單簿。
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 bg-yellow font-bold rounded hover:bg-yellow-600 text-black ${disabledClass}" onclick="CEO_ENERGY.requestTransformerOrder('${corp.id}')" ${disabled}>
                    📋 主動申領新變壓器訂單
                </button>
            </div>
        </div>`;

        // C. 在手訂單薄
        html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 text-xs">
            <div class="font-bold text-white mb-2 flex justify-between">
                <span>📋 在手變壓器長約訂單簿 (先進先出出貨)</span>
                <span class="text-gray-400">總計 ${state.backlogOrders.length} 份合約</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-[11px] border-collapse">
                    <thead>
                        <tr class="border-b border-gray-800 text-gray-500">
                            <th class="py-1">合約ID</th>
                            <th class="py-1">採購客戶名稱</th>
                            <th class="py-1 text-center">剩餘待出貨</th>
                            <th class="py-1 text-right">出貨單價</th>
                            <th class="py-1 text-center">交期剩餘</th>
                            <th class="py-1 text-right">逾期日罰金</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.backlogOrders.length === 0 ? `<tr><td colspan="6" class="py-3 text-center text-gray-600">※ 目前無排隊中變壓器訂單，產能閒置折舊中！</td></tr>` : ''}
                        ${state.backlogOrders.map(o => `
                            <tr class="border-b border-gray-900 hover:bg-gray-900 hover:bg-opacity-40">
                                <td class="py-1.5 text-cyan-400 font-mono">${o.id}</td>
                                <td class="py-1.5 font-bold">${o.clientName} ${o.isExport ? '🇺🇸' : '🇹🇼'}</td>
                                <td class="py-1.5 text-center font-mono">${o.remQty} / ${o.totalQty} 台</td>
                                <td class="py-1.5 text-right text-green-400 font-mono">TWD $${app.formatMoney(o.pricePerUnit)}</td>
                                <td class="py-1.5 text-center font-mono ${o.daysLeft < 0 ? 'text-red-400 font-bold' : (o.daysLeft <= 5 ? 'text-yellow' : 'text-gray-400')}">${o.daysLeft < 0 ? `逾期 ${Math.abs(o.daysLeft)} 天` : `${o.daysLeft} 天`}</td>
                                <td class="py-1.5 text-right text-purple-400 font-mono">TWD $${app.formatMoney(o.dailyPenalty)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

        return html;
    },

    // C2. 氣體絕緣開關與微電網整合商 UI
    renderGisUI(corp, isReadOnly) {
        const state = corp.energyState;
        const disabled = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-cyan-400 font-bold mb-2 text-sm flex items-center gap-1">🖧 氣體絕緣開關與微電網整合商 (GIS Switchgear & Microgrid)</h3>`;
        html += `<p class="text-xs text-gray-400 mb-4">專研 345KV 氣體絕緣開關 (GIS) 與微電網智慧儲能系統。專注競標國家強韌標案。當全台觸發停電跳電危機時，儲能出貨會排山倒海般湧入，獲利翻倍！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">每日儲能組裝產能</div>
                <div class="text-cyan-400 font-mono font-bold mt-0.5">${state.bessCapacity.toLocaleString()} 台/日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">EMS 智慧電網效率等級</div>
                <div class="text-cyan-400 font-bold mt-0.5">Lvl ${state.emsEfficiencyLvl} (+${state.emsEfficiencyLvl * 5}% 利潤)</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">跳電備援急單係數</div>
                <div class="font-bold mt-0.5 ${(app.state.blackoutDaysLeft || 0) > 0 ? 'text-red-400 animate-pulse' : 'text-green-400'}">${(app.state.blackoutDaysLeft || 0) > 0 ? '⚠️ 跳電急單爆發 (2.5倍)' : '🟢 正常供電無虞'}</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">台電強韌工程合約</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">${state.gridProjects.length} 份</div>
            </div>
        </div>`;

        // B. 操作
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">🖧 台電強韌標案投標</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1">
                        參與台電強韌變電所特許絕緣開關 (GIS) 工程標案競標。每次競標消耗 500 萬保證金，有大機率得標高額合約項目！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 bg-cyan-900 hover:bg-cyan-800 text-white font-bold rounded ${disabledClass}" onclick="CEO_ENERGY.bidGridProject('${corp.id}')" ${disabled}>
                    🏗️ 競標強韌變電所標案 ($5,000,000)
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">🧠 EMS 能量管理與智慧微電網</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1">
                        提升智慧電網微電網 EMS 軟體整合度。永久提高儲能系統出貨售價與溢價 5%！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 bg-green-900 hover:bg-green-800 text-white font-bold rounded ${disabledClass}" onclick="CEO_ENERGY.upgradeEms('${corp.id}')" ${disabled}>
                    🧪 研發智慧電網 (TWD $5,000,000)
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">🏭 儲能組裝產線擴產</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1">
                        投資擴大儲能設備 BESS 組裝廠房，將每日儲能組裝出貨最大上限增加 2 台。
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 bg-yellow font-bold rounded hover:bg-yellow-600 text-black ${disabledClass}" onclick="CEO_ENERGY.expandBessCapacity('${corp.id}')" ${disabled}>
                    🏗️ 擴產儲能組裝線 ($8,000,000)
                </button>
            </div>
        </div>`;

        // C. GIS 工程標案清單
        html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 text-xs">
            <div class="font-bold text-white mb-2">📋 國家變電所強韌工程標案項目 (進度認列營收)</div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-[11px] border-collapse">
                    <thead>
                        <tr class="border-b border-gray-800 text-gray-500">
                            <th class="py-1">標案ID</th>
                            <th class="py-1">工程項目名稱</th>
                            <th class="py-1 text-right">標案總金額</th>
                            <th class="py-1 text-center">工程推進進度</th>
                            <th class="py-1 text-center">工程工期剩餘</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.gridProjects.length === 0 ? `<tr><td colspan="5" class="py-3 text-center text-gray-600">※ 目前無進行中之國家強韌工程，請盡速參與投標！</td></tr>` : ''}
                        ${state.gridProjects.map(p => `
                            <tr class="border-b border-gray-900">
                                <td class="py-1.5 text-cyan-400 font-mono">${p.id}</td>
                                <td class="py-1.5 font-bold">${p.name} 🇹🇼</td>
                                <td class="py-1.5 text-right text-green-400 font-mono">TWD $${app.formatMoney(p.totalValue)}</td>
                                <td class="py-1.5 text-center font-mono">
                                    <div class="w-24 bg-gray-800 h-2.5 rounded-full inline-block mr-1">
                                        <div class="bg-cyan-400 h-2.5 rounded-full" style="width: ${p.progress}%"></div>
                                    </div>
                                    ${p.progress.toFixed(0)}%
                                </td>
                                <td class="py-1.5 text-center font-mono">${p.daysLeft} 天</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

        return html;
    },

    // D1. 綠能發電與售電公用事業 UI
    renderUtilityUI(corp, isReadOnly) {
        const state = corp.energyState;
        const disabled = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-cyan-400 font-bold mb-2 text-sm flex items-center gap-1">🍃 綠能發電與售電公用事業 (Renewables & Utility PPA)</h3>`;
        html += `<p class="text-xs text-gray-400 mb-4">前人種樹後人乘涼的公用發電模式。分為 EPC 統包工程期（高財務槓桿負債，現金流極度吃緊）與商轉收租期（每日高穩定長達 20 年 PPA 現金流），可簽訂高價科技巨頭 CPPA 合約！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">開發建設中電廠</div>
                <div class="text-yellow font-mono font-bold mt-0.5">${state.projects.filter(p => p.phase === 'epc').length} 座</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">商轉收租中電廠</div>
                <div class="text-green-400 font-mono font-bold mt-0.5">${state.projects.filter(p => p.phase === 'om').length} 座</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">每日穩定綠電租金收益</div>
                <div class="text-green-400 font-mono font-bold mt-0.5">TWD $${app.formatMoney(state.projects.filter(p => p.phase === 'om').reduce((sum, p) => sum + (p.ppaType === 'cppa' ? (p.dailyRentRev + p.cppaPremium * (app.state.semiIndex || 1.0)) : p.dailyRentRev), 0))} /日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">PPA 購電溢價率 (CPPA)</div>
                <div class="text-cyan-400 font-bold mt-0.5">RE100 綠電超熱銷 (+50%)</div>
            </div>
        </div>`;

        // B. 操作
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">☀️ 興建地面型光電站 (光電)</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1">
                        興建一期地面型光電。投資額低、槓桿比率大、工期 10 天。完工後日穩定售電租金收租。
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 bg-yellow font-bold rounded text-black hover:bg-yellow-600 ${disabledClass}" onclick="CEO_ENERGY.buildPlant('${corp.id}', 'solar')" ${disabled}>
                    ☀️ 光電項目投資 (TWD $35,000,000)
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">💨 興建特大型離岸風場 (風力)</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1 font-sans">
                        前期砸數百億大量融資，工期 30 天，現金流極度吃緊。商轉完工後，每日綠電租金超高！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 bg-cyan-900 hover:bg-cyan-800 text-white font-bold rounded ${disabledClass}" onclick="CEO_ENERGY.buildPlant('${corp.id}', 'wind')" ${disabled}>
                    💨 離岸風場投資 (TWD $80,000,000)
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">⚖️ 發電電廠售電 PPA 合約切換</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1 font-sans">
                        可選擇賣給政府的「躉購費率 (FiT)」（極度穩定），或是高價賣給需要 ESG 額度的台積電 ('semi') 簽署 CPPA，賺取高溢價！
                    </div>
                </div>
                <p class="text-[9px] text-gray-500">※ 點擊下方列表的 PPA 按鈕，即可於日常發電中自由切換合約模式。</p>
            </div>
        </div>`;

        // C. 電廠列表
        html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 text-xs">
            <div class="font-bold text-white mb-2">📋 旗下綠能電廠發電運行清單 (統包建設與商轉租售)</div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-[11px] border-collapse">
                    <thead>
                        <tr class="border-b border-gray-800 text-gray-500">
                            <th class="py-1">電廠ID</th>
                            <th class="py-1">電廠名稱</th>
                            <th class="py-1 text-center">運行狀態</th>
                            <th class="py-1 text-center">完工進度</th>
                            <th class="py-1 text-right">預計日收益</th>
                            <th class="py-1 text-center">售電合約模式</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.projects.length === 0 ? `<tr><td colspan="6" class="py-3 text-center text-gray-600">※ 目前無旗下電廠，請盡速展開光電或離岸風場建設！</td></tr>` : ''}
                        ${state.projects.map(p => `
                            <tr class="border-b border-gray-900 hover:bg-gray-900 hover:bg-opacity-40">
                                <td class="py-1.5 text-cyan-400 font-mono">${p.id}</td>
                                <td class="py-1.5 font-bold">${p.name}</td>
                                <td class="py-1.5 text-center font-mono">
                                    ${p.phase === 'epc' ? '<span class="text-yellow font-bold">🏗️ 統包興建中</span>' : '<span class="text-green-400 font-bold">🟢 商轉收租中</span>'}
                                </td>
                                <td class="py-1.5 text-center font-mono">${p.progress.toFixed(0)}%</td>
                                <td class="py-1.5 text-right text-green-400 font-mono">
                                    ${p.phase === 'epc' ? '-' : `TWD $${app.formatMoney((p.ppaType === 'cppa' ? (p.dailyRentRev + p.cppaPremium * (app.state.semiIndex || 1.0)) : p.dailyRentRev))}`}
                                </td>
                                <td class="py-1.5 text-center font-mono">
                                    ${p.phase === 'epc' ? '<span class="text-gray-500">EPC興建中</span>' : `
                                        <button class="px-1.5 py-0.5 rounded text-[10px] font-bold mr-1 ${p.ppaType === 'fit' ? 'bg-cyan-600 text-black' : 'bg-gray-900 text-gray-400'}" onclick="CEO_ENERGY.switchPpa('${corp.id}', '${p.id}', 'fit')" ${disabled}>政府 FiT</button>
                                        <button class="px-1.5 py-0.5 rounded text-[10px] font-bold ${p.ppaType === 'cppa' ? 'bg-amber-600 text-black' : 'bg-gray-900 text-gray-400'}" onclick="CEO_ENERGY.switchPpa('${corp.id}', '${p.id}', 'cppa')" ${disabled}>科技 CPPA</button>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

        return html;
    },

    // D2. 風電水下基礎與材料製造商 UI
    renderWindUI(corp, isReadOnly) {
        const state = corp.energyState;
        const disabled = isReadOnly ? 'disabled' : '';
        const disabledClass = isReadOnly ? 'opacity-50 cursor-not-allowed' : '';

        let html = `<h3 class="text-cyan-400 font-bold mb-2 text-sm flex items-center gap-1">🏗️ 風電水下基礎與材料製造商 (Wind Foundations & Jacket Structures)</h3>`;
        html += `<p class="text-xs text-gray-400 mb-4">製造離岸風力發電特許重型 Jacket 水下鋼構基礎。重金屬焊接加工。前期大量融資借貸，每日消耗資金，良率與交期是獲利關鍵，受惠於國產化政策特許高毛利！</p>`;

        // A. 狀態
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 text-center text-xs">
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">高規重鋼加工產能</div>
                <div class="text-cyan-400 font-mono font-bold mt-0.5">${state.capacity.toLocaleString()} 噸/日</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">高精密焊接品質等級</div>
                <div class="text-cyan-400 font-bold mt-0.5">Lvl ${state.weldingQualityLvl} (良率 ${(state.weldingQualityLvl === 3 ? 99.8 : (state.weldingQualityLvl === 2 ? 98.0 : 92.0))}% )</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">特許國產化政策溢價</div>
                <div class="text-green-400 font-bold mt-0.5">🟢 國產化特許保護中</div>
            </div>
            <div class="bg-gray-950 p-2 rounded border border-gray-900">
                <div class="text-gray-500">進行中水下基礎合約</div>
                <div class="text-amber-400 font-mono font-bold mt-0.5">${state.jacketProjects.length} 份</div>
            </div>
        </div>`;

        // B. 操作
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">🏗️ 申領大型水下 Jacket 建造項目</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1">
                        申領水下 Jacket 套管基礎大型建造項目。需要 60 天組裝期，完工後可享有高額出貨尾款結算毛利！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 bg-cyan-900 hover:bg-cyan-800 text-white font-bold rounded ${disabledClass}" onclick="CEO_ENERGY.requestJacketProject('${corp.id}')" ${disabled}>
                    🏗️ 申領 Jacket 建造項目 (簽署合約)
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">🔬 焊接探傷自動化與焊接品質研發</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1 font-sans">
                        提升探傷超音波與焊接自動化。永久提高焊接良率，杜絕因氣孔瑕疵引發的天價重工與工期延誤！
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 bg-green-900 hover:bg-green-800 text-white font-bold rounded ${disabledClass}" onclick="CEO_ENERGY.upgradeWelding('${corp.id}')" ${disabled}>
                    🧪 研發無瑕疵焊接 (TWD $6,000,000)
                </button>
            </div>

            <div class="bg-gray-950 p-3 rounded border border-gray-900 space-y-2 flex flex-col justify-between">
                <div>
                    <div class="font-bold text-white border-l-2 border-cyan-400 pl-1.5">📈 鋼構重工擴產</div>
                    <div class="text-[10px] text-gray-500 leading-relaxed mt-1">
                        擴建組裝碼頭與重型吊掛起重機（每次增加 1 單位基礎產能上限）。
                    </div>
                </div>
                <button class="w-full mt-2 py-1.5 bg-yellow font-bold rounded hover:bg-yellow-600 text-black ${disabledClass}" onclick="CEO_ENERGY.expandJacketCapacity('${corp.id}')" ${disabled}>
                    🏗️ 擴大組裝產能 ($10,000,000)
                </button>
            </div>
        </div>`;

        // C. 水下基礎工程
        html += `<div class="bg-gray-950 p-3 rounded border border-gray-900 text-xs">
            <div class="font-bold text-white mb-2">📋 旗下 Jacket 水下鋼構基礎組裝建造列表 (出貨認列收益)</div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-[11px] border-collapse">
                    <thead>
                        <tr class="border-b border-gray-800 text-gray-500">
                            <th class="py-1">項目ID</th>
                            <th class="py-1">風電合約名稱</th>
                            <th class="py-1 text-right">合約總價值</th>
                            <th class="py-1 text-right">已融資開銷</th>
                            <th class="py-1 text-center">工程進度</th>
                            <th class="py-1 text-center">工程狀態</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.jacketProjects.length === 0 ? `<tr><td colspan="6" class="py-3 text-center text-gray-600">※ 目前無進行中之水下基礎工程。</td></tr>` : ''}
                        ${state.jacketProjects.map(j => `
                            <tr class="border-b border-gray-900 hover:bg-gray-900 hover:bg-opacity-40">
                                <td class="py-1.5 text-cyan-400 font-mono">${j.id}</td>
                                <td class="py-1.5 font-bold">${j.name} 🇹🇼</td>
                                <td class="py-1.5 text-right text-green-400 font-mono">TWD $${app.formatMoney(j.contractValue)}</td>
                                <td class="py-1.5 text-right text-red-400 font-mono">TWD $${app.formatMoney(j.capExNeeded)}</td>
                                <td class="py-1.5 text-center font-mono">
                                    <div class="w-20 bg-gray-800 h-2 rounded-full inline-block mr-1">
                                        <div class="bg-cyan-400 h-2 rounded-full" style="width: ${j.progress}%"></div>
                                    </div>
                                    ${j.progress.toFixed(0)}%
                                </td>
                                <td class="py-1.5 text-center font-mono font-bold text-yellow">🏗️ 統包建造中</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

        return html;
    },

    // ==========================================
    // 5. 互動式全域 ACTIONS 函式實作
    // ==========================================
    setVal(corpId, field, val) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        corp.energyState[field] = Number(val) || 0;
        app.updateUI();
    },

    toggleMaintenance(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const state = corp.energyState;
        state.maintenanceMode = !state.maintenanceMode;

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: state.maintenanceMode ? '【營運調度】鑑於裂解價差暴跌，啟動全廠大規模歲修停機，以規避高價庫存跌價損益。' : '【營運調度】停機歲修順利完畢，全廠裂解生產線全面重啟！',
            isGood: !state.maintenanceMode
        });

        app.log(state.maintenanceMode ? `【歲修開始】${corp.name} 啟動歲修，生產暫停以避開跌價損失！` : `【重啟開機】${corp.name} 歲修結束，裂解爐全面開工！`, state.maintenanceMode ? 'text-amber-400 font-bold' : 'text-green-400 font-bold');
        app.updateUI();
    },

    upgradeCarbonCapture(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 10000000; // 1000 萬
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司帳上盈餘資金不足 TWD $10,000,000，無法投資碳捕捉設備！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.carbonCaptureLvl = (state.carbonCaptureLvl || 0) + 1;
        state.carbonCaptureRate = Math.min(0.90, (state.carbonCaptureRate || 0) + 0.15);

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【環保增資】投入 TWD $10,000,000 進行第 ${state.carbonCaptureLvl} 期碳捕捉與 ESG 減碳系統升級，目前排碳捕捉率已達 ${(state.carbonCaptureRate * 100).toFixed(0)}%！`,
            isGood: true
        });

        app.log(`【碳捕捉升級】${corp.name} 減碳捕捉率已提升至 ${(state.carbonCaptureRate * 100).toFixed(0)}%！`, 'text-cyan-400 font-bold');
        app.updateUI();
    },

    upgradeAdvancedMaterials(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 8000000; // 800 萬
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司帳上盈餘資金不足 TWD $8,000,000，無法進行機能材料研發！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.advancedMaterialRndLvl = (state.advancedMaterialRndLvl || 0) + 1;

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【研發突破】投入 TWD $8,000,000 進行第 ${state.advancedMaterialRndLvl} 期機能材料與高端紡絲材料開發，高端機能纖維出貨單價永久加成 5%！`,
            isGood: true
        });

        app.log(`【研發突破】${corp.name} 機能紡絲材料研發等級已提升至 Lvl ${state.advancedMaterialRndLvl}！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    enablePcr(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 15000000; // 1500 萬
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司帳上盈餘資金不足 TWD $15,000,000，無法建置 PCR 再生循環系統！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.pcrRecycleEnabled = true;

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【ESG永續】成功建置 PCR 再生塑料回收循環系統。原料乙烯成本永久降低 15%，享有 10% 綠色溢價並減免 20% 碳排罰金！`,
            isGood: true
        });

        app.log(`【PCR建置完成】${corp.name} PCR 再生循環系統成功投入運轉！`, 'text-cyan-400 font-bold');
        app.updateUI();
    },

    toggleFurnace(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const state = corp.energyState;
        if (state.isFurnaceOn) {
            // 熄火
            state.isFurnaceOn = false;
            corp.companyNews.push({
                date: app.formatDateStr(app.state.date).substring(5),
                msg: '【產能調度】為規避焦煤採購虧損與水泥爆倉積壓，決定對高溫熟料旋窯進行安全熄火休眠！',
                isGood: false
            });
            app.log(`【旋窯熄火】${corp.name} 窯爐正式熄火休眠，避免煤炭高能耗與在庫積壓！`, 'text-amber-400 font-bold');
        } else {
            // 重啟點火 (需一次性花費 300 萬)
            const cost = 3000000;
            if (corp.corporateCash < cost) {
                app.log('【重啟失敗】公司盈餘資金不足 TWD $3,000,000，無法支付天價旋窯重啟點火與升溫維護費！', 'text-red-500 font-bold');
                return;
            }
            corp.corporateCash -= cost;
            state.isFurnaceOn = true;
            corp.companyNews.push({
                date: app.formatDateStr(app.state.date).substring(5),
                msg: '【產能調度】投入 TWD $3,000,000 天價維護與點火費，高溫旋窯重新點火升溫，重啟熟料生產線！',
                isGood: true
            });
            app.log(`【重啟點火】${corp.name} 水泥旋窯重啟成功，恢復熟料煅燒生產！`, 'text-green-400 font-bold');
        }
        app.updateUI();
    },

    enableCoProcessing(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 15000000; // 1500 萬
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司盈餘資金不足 TWD $15,000,000，無法建置旋窯廢棄物協同處理！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.coProcessingEnabled = true;

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【循環經濟】成功建置工業廢棄物與廢輪胎協同處理系統。焦煤能耗成本永久降低 20%，並獲得政府協同處理每日處理補貼津貼！`,
            isGood: true
        });

        app.log(`【協同處理已建置】${corp.name} 水泥旋窯已成功改造為廢棄物協同處理系統！`, 'text-cyan-400 font-bold');
        app.updateUI();
    },

    enableLowCarbonCement(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 25000000; // 2500 萬
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司盈餘資金不足 TWD $25,000,000，無法研發超低碳水泥！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.lowCarbonCementEnabled = true;
        state.greenPremiumPct = 15; // 取得 15% 溢價

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【低碳科技】超低碳煅燒熟料黏土水泥研發大突破！水泥生產排碳大降 60%，豁免 60% 碳費，並享有 15% 的高溢價定價與優先標案承攬權！`,
            isGood: true
        });

        app.log(`【低碳水泥解鎖】${corp.name} 超低碳熟料水泥研發大成功，進入綠色溢價時代！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    toggleSteelFurnace(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const state = corp.energyState;
        if (state.isFurnaceOn) {
            state.isFurnaceOn = false;
            corp.companyNews.push({
                date: app.formatDateStr(app.state.date).substring(5),
                msg: '【產能調度】為防止鋼鐵爆倉跌價及焦煤採購失血，決定對大型高爐進行熄火安全休眠！',
                isGood: false
            });
            app.log(`【高爐熄火】${corp.name} 煉鋼高爐正式休眠，避免鋼材爆倉與能耗採購失血！`, 'text-amber-400 font-bold');
        } else {
            const cost = 4000000;
            if (corp.corporateCash < cost) {
                app.log('【重啟失敗】公司盈餘資金不足 TWD $4,000,000，無法支付天價高爐點火重啟與重新吹煉維護費！', 'text-red-500 font-bold');
                return;
            }
            corp.corporateCash -= cost;
            state.isFurnaceOn = true;
            corp.companyNews.push({
                date: app.formatDateStr(app.state.date).substring(5),
                msg: '【產能調度】投入 TWD $4,000,000 重啟大型高爐，鐵水高溫熔融與鋼鐵冶煉產能重新恢復！',
                isGood: true
            });
            app.log(`【高爐重啟】${corp.name} 煉鋼高爐重啟成功，全面恢復出鐵與軋鋼！`, 'text-green-400 font-bold');
        }
        app.updateUI();
    },

    enableHydrogenSteel(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 40000000; // 4000 萬
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司盈餘資金不足 TWD $40,000,000，無法研發氫能冶金技術！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.hydrogenSteelmakingEnabled = true;

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【重工業革命】無碳「氫能冶金工藝」實現商業運作！以綠氫代替焦煤吹煉，高爐出鐵排碳完全歸零，零碳綠鋼享有 40% 超高溢價且完全免徵碳費！`,
            isGood: true
        });

        app.log(`【氫能冶金大突破】${corp.name} 綠氫鋼鐵冶煉工藝成功導入，免除所有碳稅費懲罰！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    // C1. 變壓器 ACTIONS
    expandTransformerGrid(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 15000000; // 1500 萬
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司盈餘資金不足 TWD $15,000,000，無法擴充變壓器繞線產線！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.expansionDaysLeft = 10;
        state.expansionQty = 5; // 10 天後產能增加 5 台/日

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【產能擴增】投入 TWD $15,000,000 追加繞線機台並增聘繞線師傅。預計 10 天後變壓器基礎繞線產能永久提升 5 台/日！`,
            isGood: true
        });

        app.log(`【產能建置中】${corp.name} 變壓器繞線新產線已動工，預計 10 天後落成！`, 'text-cyan-400 font-bold');
        app.updateUI();
    },

    setShift(corpId, shift) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const state = corp.energyState;
        state.workersShift = shift;

        let shiftText = shift === 3 ? '三班全天輪番加班' : (shift === 2 ? '兩班制加班' : '正常單班正常');
        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【勞動調度】調整生產線班制為：「${shiftText}」，全力消化手頭積壓變壓器工程訂單！`,
            isGood: true
        });

        app.log(`【生產線調度】${corp.name} 生產班制已調整為：「${shiftText}」！`, 'text-cyan-400 font-bold');
        app.updateUI();
    },

    applyUsCert(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 30000000; // 3000 萬
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司盈餘資金不足 TWD $30,000,000，無法投入北美外銷安規認證！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.usCertDaysLeft = 20; // 20 天後通過

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【外銷大略】投入 TWD $30,000,000 向北美測試實驗室申辦特高壓變壓器安規認證。預計 20 天後取得，解鎖 2.5 倍高溢價北美電網特急訂單！`,
            isGood: true
        });

        app.log(`【認證建置中】${corp.name} 正在進行北美特高壓變壓器安規檢測，預計 20 天後通過！`, 'text-cyan-400 font-bold');
        app.updateUI();
    },

    requestTransformerOrder(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const state = corp.energyState;
        
        // 限制在手合約排隊長度，防止刷單
        if (state.backlogOrders.length >= 8) {
            app.log('【訂單爆倉】在手未出貨合約已有 8 份排隊中！請先擴展產能或調整班制加班消化，避免逾期交付產生違約金！', 'text-red-500 font-bold');
            return;
        }

        const isExport = state.usCertification && Math.random() < 0.5;
        const oQty = Math.floor(Math.random() * 40 + 20);
        const orderId = 'ORD-' + Math.floor(Math.random() * 9000 + 1000);

        state.backlogOrders.push({
            id: orderId,
            clientName: isExport ? '美國 Google 資料中心變電所' : '台電強韌電網變電所工程',
            totalQty: oQty,
            remQty: oQty,
            pricePerUnit: isExport ? 50000 : 42000,
            costPerUnit: 15000,
            daysLeft: 40,
            dailyPenalty: isExport ? 20000 : 6000,
            isExport: isExport
        });

        app.log(`【合約簽訂】成功爭取到「${isExport ? '美國資料中心' : '台電強韌電網'}」採購長約 ${oQty} 台變壓器，已加入出貨排程簿！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    // C2. 微電網 ACTIONS
    bidGridProject(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 5000000; // 500 萬投標保證金與前置開發
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司盈餘資金不足 TWD $5,000,000，無法競標台電絕緣變電站標案！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        
        // 計算得標勝率 (受 EMS 等級加成)
        const winProb = 0.50 + state.emsEfficiencyLvl * 0.10;
        if (Math.random() <= winProb) {
            const projVal = Math.floor(Math.random() * 60000000 + 40000000); // 4000萬~1億
            const pDays = Math.floor(Math.random() * 40 + 50);
            const pId = 'PROJ-' + Math.floor(Math.random() * 900 + 100);

            state.gridProjects.push({
                id: pId,
                name: '台電強韌微電網 GIS 特許變電工程',
                totalValue: projVal,
                duration: pDays,
                daysLeft: pDays,
                progress: 0
            });

            corp.companyNews.push({
                date: app.formatDateStr(app.state.date).substring(5),
                msg: `【招投中標】成功擊敗對手，中標承攬國家強韌電網特許變電所「${pId}」工程，合約總價高達 TWD $${app.formatMoney(projVal)}！`,
                isGood: true
            });

            app.log(`【招標捷報】${corp.name} 成功奪下總價 TWD $${app.formatMoney(projVal)} 的國家強韌變電所特許絕緣 GIS 工程大單！`, 'text-green-400 font-bold');
        } else {
            app.log('【競標失利】本次強韌電網開關競標因競標對手出價過低而遺憾未能中標，保證金扣除以補貼投標籌備行政支出！', 'text-red-400');
        }
        app.updateUI();
    },

    upgradeEms(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 5000000;
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司盈餘資金不足 TWD $5,000,000，無法研發智慧微電網技術！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.emsEfficiencyLvl = (state.emsEfficiencyLvl || 0) + 1;

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【智慧微電網】智慧 EMS 電網能量管理效率提升至 Lvl ${state.emsEfficiencyLvl}。儲能備援系統出貨價格與工程標案溢價永久加成 5%！`,
            isGood: true
        });

        app.log(`【電網技術升級】${corp.name} 智慧微電網 EMS 電網管理效率已提升至 Lvl ${state.emsEfficiencyLvl}！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    expandBessCapacity(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 8000000;
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司盈餘資金不足 TWD $8,000,000，無法擴充儲能組裝產線！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.bessCapacity = (state.bessCapacity || 0) + 2;

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【產能擴增】投資 TWD $8,000,000 擴大儲能設備 BESS 組裝廠房，每日最大儲能系統出貨產能永久增加 2 台！`,
            isGood: true
        });

        app.log(`【儲能產線擴建】${corp.name} 智慧儲能組裝每日出貨最大上限已提升至 ${state.bessCapacity} 台！`, 'text-cyan-400 font-bold');
        app.updateUI();
    },

    // D1. 綠能公用 ACTIONS
    buildPlant(corpId, type) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = type === 'solar' ? 35000000 : 80000000; // 3500萬 或 8000萬
        if (corp.corporateCash < cost) {
            app.log(`【資金不足】公司盈餘資金不足 TWD $${app.formatMoney(cost)}，無法投資建設該發電項目！`, 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        const pId = 'P-' + Math.floor(Math.random() * 9000 + 1000);

        state.projects.push({
            id: pId,
            name: type === 'solar' ? '屏東佳冬一期太陽能光電廠' : '雲林外海二期離岸風場',
            phase: 'epc',
            progress: 0,
            capExNeeded: cost,
            duration: type === 'solar' ? 10 : 30, // 光電 10 天完工，風電 30 天
            financeLeverage: type === 'solar' ? 0.8 : 0.9,
            dailyMaintenance: type === 'solar' ? 12000 : 25000,
            dailyRentRev: type === 'solar' ? 24000 : 56000,
            ppaType: 'fit',
            cppaPremium: type === 'solar' ? 12000 : 28000
        });

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【綠能立項】斥資 TWD $${app.formatMoney(cost)}（採用高槓桿綠色融資貸款）啟動「${type === 'solar' ? '地面型光電' : '大型離岸風場'}」發電項目統包建設，開始進入 EPC 統包工程期！`,
            isGood: true
        });

        app.log(`【綠能項目動工】${corp.name} 綠能發電廠統包工程已正式動工，進入高負債工程開發階段！`, 'text-cyan-400 font-bold');
        app.updateUI();
    },

    switchPpa(corpId, projId, type) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const state = corp.energyState;
        const proj = state.projects.find(p => p.id === projId);
        if (!proj) return;

        proj.ppaType = type;
        app.log(`【合約切換】${proj.name} 已將售電合約模式變更為：「${type === 'fit' ? '政府躉購費率 (FiT)' : '科技巨頭綠電 CPPA 協議'}」！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    // D2. 風電水下基礎 ACTIONS
    requestJacketProject(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const state = corp.energyState;
        
        // 限制進行中合約，防刷
        if (state.jacketProjects.length >= 3) {
            app.log('【船塢碼頭滿載】重型焊接吊裝碼頭與重型組裝船塢均已被水下 Jacket 鋼構基礎項目塞滿！請先精進焊接品質提高出貨良率完工出貨，避免資金斷鏈！', 'text-red-500 font-bold');
            return;
        }

        const scale = Math.max(1, Math.floor((corp.price * corp.totalShares) / 100000000)) || 1;
        const contractVal = scale * 120000000;
        const capEx = scale * 60000000;
        const jId = 'WIND-' + Math.floor(Math.random() * 900 + 100);

        state.jacketProjects.push({
            id: jId,
            name: '哥本哈根基礎建設 (CIP) 彰芳西島 Jacket 鋼構工程',
            contractValue: contractVal,
            capExNeeded: capEx,
            progress: 0,
            phase: 'epc',
            isCompleted: false
        });

        app.log(`【風電合約簽訂】成功承攬重型水下基礎建造合約，總合約價值達 TWD $${app.formatMoney(contractVal)}，已拖入焊接組裝船塢！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    upgradeWelding(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 6000000;
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司盈餘資金不足 TWD $6,000,000，無法升級焊接檢測工法！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.weldingQualityLvl = (state.weldingQualityLvl || 1) + 1;

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【技術突破】投入 TWD $6,000,000 進行第 ${state.weldingQualityLvl} 期焊接品質與超音波自動化探傷開發。水下基礎焊接良率永久提升，大降瑕疵重工成本！`,
            isGood: true
        });

        app.log(`【焊接技術突破】${corp.name} 高精密水下鋼構焊接技術研發等級已提升至 Lvl ${state.weldingQualityLvl}！`, 'text-green-400 font-bold');
        app.updateUI();
    },

    expandJacketCapacity(corpId) {
        if (typeof app === 'undefined') return;
        const corp = app.state.stocks.find(s => s.id === corpId);
        if (!corp || !corp.energyState) return;

        const cost = 10000000;
        if (corp.corporateCash < cost) {
            app.log('【資金不足】公司盈餘資金不足 TWD $10,000,000，無法擴大鋼構產能！', 'text-red-500 font-bold');
            return;
        }

        corp.corporateCash -= cost;
        const state = corp.energyState;
        state.capacity = (state.capacity || 0) + 1;

        corp.companyNews.push({
            date: app.formatDateStr(app.state.date).substring(5),
            msg: `【船塢擴建】投資 TWD $10,000,000 擴建重鋼吊裝碼頭與重型吊吊車。重鋼組裝產能永久提升 1 單位！`,
            isGood: true
        });

        app.log(`【組裝碼頭擴充】${corp.name} 水下基礎鋼構基礎每日組裝出貨最大上限已提升至 ${state.capacity} 單位！`, 'text-cyan-400 font-bold');
        app.updateUI();
    },

    // ==========================================
    // 6. 每日營收收支結算運算 (processRevenue) - 核心
    // ==========================================
    processRevenue(corp) {
        if (!corp.energyState) this.initAssets(corp);
        const state = corp.energyState;
        
        // 保障全域變數
        if (typeof app !== 'undefined' && app.state) {
            if (!app.state.oilPrice) app.state.oilPrice = 80.0;
            if (!app.state.prevOilPrice) app.state.prevOilPrice = 80.0;
            if (!app.state.carbonTaxRate) app.state.carbonTaxRate = 300.0;
            if (!app.state.interestRate) app.state.interestRate = 0.05;
        }
        
        const oilPrice = (app.state && app.state.oilPrice) ? app.state.oilPrice : 80.0;
        const prevOilPrice = (app.state && app.state.prevOilPrice) ? app.state.prevOilPrice : 80.0;
        const carbonTax = (app.state && app.state.carbonTaxRate) ? app.state.carbonTaxRate : 300.0;

        let revenue = 0;
        let cost = 0;
        let dailyProfit = 0;
        let taxSubsidized = 1.0;

        // 國家重大重工業減碳補助（保護初創與上市前三個月）
        let daysOld = Math.ceil(Math.abs(app.state.date - new Date(corp.foundDate || app.state.date)) / (1000 * 60 * 60 * 24));
        let ipoDate = corp.ipoDate ? new Date(corp.ipoDate) : null;
        let ipoDaysOld = ipoDate ? Math.ceil(Math.abs(app.state.date - ipoDate) / (1000 * 60 * 60 * 24)) : 999;
        let isFirstQuarterSubsidized = (corp.isPlayerFounded && daysOld <= 90) || (corp.isListed && ipoDaysOld <= 90);
        if (isFirstQuarterSubsidized) {
            taxSubsidized = 0.60; // 行政折舊免除與補貼，成本降低 40%
        }

        // C1 變壓器認證工期推進
        if (state.usCertDaysLeft && state.usCertDaysLeft > 0) {
            state.usCertDaysLeft--;
            if (state.usCertDaysLeft === 0) {
                state.usCertification = true;
                corp.companyNews.push({
                    date: app.formatDateStr(app.state.date).substring(5),
                    msg: '【外銷突破】成功取得北美特高壓變壓器安規認證！即日起解鎖 2.5 倍高溢價北美電網特急訂單！',
                    isGood: true
                });
                app.log(`【認證通過】${corp.name} 通過北美安規認證，大步邁向北美外銷電網市場！`, 'text-green-400 font-bold');
            }
        }

        // C1 廠房擴建工期推進
        if (state.expansionDaysLeft && state.expansionDaysLeft > 0) {
            state.expansionDaysLeft--;
            if (state.expansionDaysLeft === 0) {
                state.capacity += state.expansionQty;
                state.expansionQty = 0;
                corp.companyNews.push({
                    date: app.formatDateStr(app.state.date).substring(5),
                    msg: '【產能解鎖】變壓器繞線新廠房與繞線機組全面落成投產！產能大幅釋放！',
                    isGood: true
                });
                app.log(`【擴產完成】${corp.name} 繞線廠房擴建落成，產能已成功釋放！`, 'text-green-400 font-bold');
            }
        }

        // ==========================================
        // 八大客製化商業模型日結算公式
        // ==========================================

        // 1. 輕油裂解與煉油廠 (refinery_cracking)
        if (corp.bizModel === 'refinery_cracking') {
            let processedOil = Number(state.capacity) * (Number(state.utilization) / 100);
            if (state.maintenanceMode) processedOil = 0;

            let oilCost = processedOil * oilPrice * 30; // 美元換算台幣，1美元=30台幣
            let refinedProductPrice = oilPrice * 1.35; // 裂解成品 35% 溢價
            revenue = processedOil * refinedProductPrice * 30;

            // 原油在途在庫評價損益 (受油價波動影響，油價大漲在途低價原油增值)
            let priceDelta = oilPrice - prevOilPrice;
            let inventoryValuation = processedOil * priceDelta * 30 * 0.5;

            // 碳費罰款 (碳捕捉系統折減碳費)
            let carbonEmission = processedOil * 0.1; // 每加工 1 桶原油排碳 0.1 噸
            let carbonPenalty = carbonEmission * (1 - (state.carbonCaptureRate || 0)) * carbonTax;

            let fixedCost = Number(state.capacity) * 30;
            if (state.maintenanceMode) fixedCost *= 0.5; // 歲修固定行政折舊成本折半

            dailyProfit = revenue - oilCost + inventoryValuation - carbonPenalty - (fixedCost * taxSubsidized);
        }

        // 2. 聚合物與塑膠纖維廠 (polymers_fibers)
        else if (corp.bizModel === 'polymers_fibers') {
            let ethylenePrice = oilPrice * 1.15 * 30; // 乙烯採購價/噸
            let capacityUsed = Number(state.capacity);
            let rawMaterialCost = capacityUsed * ethylenePrice;

            if (state.pcrRecycleEnabled) {
                rawMaterialCost *= 0.85; // PCR 降低 15% 原料採購成本
            }

            let premiumPct = 1.0;
            if (state.pcrRecycleEnabled) premiumPct += 0.10; // PCR 綠色售價溢價 10%

            let premiumFiberPct = (Number(state.productMixPct) || 20) / 100;
            let generalPlasticPct = 1 - premiumFiberPct;

            let generalPlasticPrice = ethylenePrice * 1.25 * premiumPct;
            let premiumFiberPrice = ethylenePrice * 1.75 * premiumPct * (1 + (state.advancedMaterialRndLvl || 0) * 0.05);

            // 銷量受零售消費景氣與零售板塊指數連動
            let retailIndex = (app.state && app.state.retailIndex) ? app.state.retailIndex : 1.0;
            let sales = capacityUsed * retailIndex;
            revenue = sales * (generalPlasticPct * generalPlasticPrice + premiumFiberPct * premiumFiberPrice);

            // 碳排罰金 (PCR 降低 20% 通用碳排)
            let baseEmission = capacityUsed * 0.6;
            if (state.pcrRecycleEnabled) baseEmission *= 0.8;
            let carbonPenalty = baseEmission * carbonTax;

            let fixedCost = Number(state.capacity) * 150;
            dailyProfit = revenue - rawMaterialCost - carbonPenalty - (fixedCost * taxSubsidized);
        }

        // 3. 水泥製造廠 (cement_kiln)
        else if (corp.bizModel === 'cement_kiln') {
            let production = state.isFurnaceOn ? Number(state.capacity) : 0;
            let realestateIndex = (app.state && app.state.realestateIndex) ? app.state.realestateIndex : 1.0;
            let sales = Math.min(production + Number(state.inventory || 0), production * realestateIndex);

            // 能耗焦煤價格與原油連動
            let coalPrice = (oilPrice / 2) * 30;
            let coalCost = production * 0.25 * coalPrice; // 水泥每噸消耗焦煤
            if (state.coProcessingEnabled) {
                coalCost *= 0.80; // 協同處理降低 20% 煤炭採購
            }

            let steelPrice = 1500 * (1 + (state.greenPremiumPct || 0) / 100) * realestateIndex;

            // 碳費罰款 (超低碳研發豁免 60% 排放)
            let emissionRate = 0.8;
            if (state.lowCarbonCementEnabled) emissionRate = 0.32; // 降 60%
            let carbonPenalty = production * emissionRate * carbonTax;

            revenue = sales * steelPrice;

            // 庫存保管損益
            let invChange = production - sales;
            state.inventory = Math.max(0, (Number(state.inventory) || 0) + invChange);
            let inventoryHoldingCost = state.inventory * 300; // 噸水泥日保管費

            let fixedCost = Number(state.capacity) * 200;
            if (!state.isFurnaceOn) fixedCost *= 0.8; // 熄火時折舊費用降 20%

            // 政府協同處理廢棄物每日津貼
            let govSubsidy = state.coProcessingEnabled ? (production * 150) : 0;

            dailyProfit = revenue - coalCost - carbonPenalty - inventoryHoldingCost - (fixedCost * taxSubsidized) + govSubsidy;
        }

        // 4. 鋼鐵冶煉廠 (steel_furnace)
        else if (corp.bizModel === 'steel_furnace') {
            let production = state.isFurnaceOn ? Number(state.capacity) : 0;
            let realestateIndex = (app.state && app.state.realestateIndex) ? app.state.realestateIndex : 1.0;
            let electronicsIndex = (app.state && app.state.electronicsIndex) ? app.state.electronicsIndex : 1.0;
            let industrialIndex = (realestateIndex * 0.5 + electronicsIndex * 0.5) || 1.0;
            let sales = Math.min(production + Number(state.steelInventory || 0), production * industrialIndex);

            let blastPct = (Number(state.processMixPct) || 80) / 100;
            let electricPct = 1 - blastPct;

            // 高爐熔煉能耗成本 (焦煤鐵礦砂)
            let blastCost = production * blastPct * (1200 + oilPrice * 2.5);
            // 電弧爐熔煉能耗成本 (廢鋼電價，受電價連動)
            let electricCost = production * electricPct * (2500 + oilPrice * 1.5);

            // 碳排放 (高爐 1.8 噸/噸鋼，電弧爐 0.4 噸/噸鋼)
            let emission = production * (blastPct * 1.8 + electricPct * 0.4);
            if (state.hydrogenSteelmakingEnabled) {
                emission = 0; // 氫能冶金技術完全零碳排！
            }
            let carbonPenalty = emission * carbonTax;

            let baseSteelPrice = 18000;
            if (state.hydrogenSteelmakingEnabled) {
                baseSteelPrice *= 1.40; // 零碳綠鋼高溢價 40%
            }
            let steelPrice = baseSteelPrice * industrialIndex;
            revenue = sales * steelPrice;

            // 鋼材在庫保管成本
            let invChange = production - sales;
            state.steelInventory = Math.max(0, (Number(state.steelInventory) || 0) + invChange);
            let inventoryHoldingCost = state.steelInventory * 500;

            let fixedCost = Number(state.capacity) * 1500;
            if (!state.isFurnaceOn) fixedCost *= 0.7; // 熄火折舊降低

            dailyProfit = revenue - blastCost - electricCost - carbonPenalty - inventoryHoldingCost - (fixedCost * taxSubsidized);
        }

        // 5. 高壓變壓器與電網設備廠 (transformer_grid)
        else if (corp.bizModel === 'transformer_grid') {
            let shiftMultiplier = 1.0;
            let laborCostMod = 1.0;
            if (state.workersShift === 2) { shiftMultiplier = 1.3; laborCostMod = 1.4; }
            if (state.workersShift === 3) { shiftMultiplier = 1.6; laborCostMod = 1.9; }

            let activeCapacity = Number(state.capacity) * shiftMultiplier;
            let delayPenalties = 0;
            let rawCost = 0;

            // 先進先出出貨
            for (let order of state.backlogOrders) {
                if (activeCapacity <= 0) {
                    order.daysLeft--;
                    if (order.daysLeft < 0) {
                        delayPenalties += order.dailyPenalty;
                    }
                    continue;
                }

                let processed = Math.min(activeCapacity, order.remQty);
                order.remQty -= processed;
                activeCapacity -= processed;

                let pricePerUnit = order.pricePerUnit;
                if (state.usCertification && order.isExport) {
                    pricePerUnit *= 2.5; // 美國外銷特急大訂單 2.5 倍天價！
                }

                revenue += processed * pricePerUnit;
                rawCost += processed * order.costPerUnit * laborCostMod;
            }

            // 移除已出貨完畢訂單
            state.backlogOrders = state.backlogOrders.filter(o => o.remQty > 0);

            let fixedCost = Number(state.capacity) * 1000;
            dailyProfit = revenue - rawCost - delayPenalties - (fixedCost * taxSubsidized);
        }

        // 6. 氣體絕緣開關與微電網整合商 (gis_microgrid)
        else if (corp.bizModel === 'gis_microgrid') {
            let projRev = 0;
            let projCost = 0;

            // A. GIS 絕緣工程項目按進度結算認列營收
            for (let proj of state.gridProjects) {
                proj.daysLeft--;
                let dur = Number(proj.duration) > 0 ? Number(proj.duration) : 30;
                proj.progress = Math.min(100, proj.progress + (100 / dur));
                
                let dailyVal = (Number(proj.totalValue) || 0) / dur;
                projRev += dailyVal;
                projCost += dailyVal * 0.75; // GIS 工程毛利率 25%
            }
            state.gridProjects = state.gridProjects.filter(p => p.progress < 100 && p.daysLeft > 0);

            // B. 智慧儲能系統出貨 (若跳電危機大跳電，銷量暴增 2.5 倍)
            let isBlackout = (app.state && app.state.blackoutDaysLeft && app.state.blackoutDaysLeft > 0) ? true : false;
            let electronicsIndex = (app.state && app.state.electronicsIndex) ? app.state.electronicsIndex : 1.0;
            let bessSales = Number(state.bessCapacity) * electronicsIndex;
            if (isBlackout) {
                bessSales *= 2.5; // 緊急備援儲能急單暴增
            }

            let bessPrice = 250000 * (1 + (state.emsEfficiencyLvl || 0) * 0.05); // 受 EMS 等級加成
            let bessRev = bessSales * bessPrice;
            let bessCost = bessSales * 180000;

            let fixedCost = Number(state.capacity) * 2000;
            dailyProfit = projRev + bessRev - projCost - bessCost - (fixedCost * taxSubsidized);
            
            // 💡 確保核心營運營收正確寫入全域變數，以供倒推並渲染現金流明細
            revenue = projRev + bessRev;
        }

        // 7. 綠能發電與售電公用事業 (utility_ppa)
        else if (corp.bizModel === 'utility_ppa') {
            let epcCapExCost = 0;
            let interestExpense = 0;
            let rentRevTotal = 0;
            let maintTotal = 0;

            const interestRate = (app.state && app.state.interestRate) ? app.state.interestRate : 0.05;
            const semiIndex = (app.state && app.state.semiIndex) ? app.state.semiIndex : 1.0;

            for (let proj of state.projects) {
                if (proj.phase === 'epc') {
                    // EPC 建設期
                    let dur = Number(proj.duration) > 0 ? Number(proj.duration) : 30;
                    proj.progress = Math.min(100, proj.progress + (100 / dur));
                    let dailyCapEx = (Number(proj.capExNeeded) || 0) / dur;
                    epcCapExCost += dailyCapEx; // EPC 支出
                    
                    // 高財務槓桿貸款利息
                    interestExpense += (proj.capExNeeded * proj.financeLeverage) * (interestRate / 365);
                    
                    if (proj.progress >= 100) {
                        proj.phase = 'om'; // 完工轉商轉
                        corp.companyNews.push({
                            date: app.formatDateStr(app.state.date).substring(5),
                            msg: `【商轉捷報】旗下綠能電廠「${proj.name}」統包建設全面落成！正式進入商轉售電收租階段！`,
                            isGood: true
                        });
                        app.log(`【發電商轉】${corp.name} 旗艦電廠 ${proj.name} 已開始併網商轉售電！`, 'text-green-400 font-bold');
                    }
                } else if (proj.phase === 'om') {
                    // OM 商轉收租期
                    let rentRev = proj.dailyRentRev;
                    if (proj.ppaType === 'cppa') {
                        rentRev += proj.cppaPremium * semiIndex; // 科技巨頭高價 CPPA 綠電溢價
                    }
                    rentRevTotal += rentRev;
                    maintTotal += proj.dailyMaintenance;
                }
            }

            // 扣除大額 EPC 工程款 (從公司現金扣減)
            if (epcCapExCost > 0) {
                corp.corporateCash = Math.max(0, corp.corporateCash - epcCapExCost);
            }

            let fixedCost = Number(state.capacity) * 500;
            dailyProfit = rentRevTotal - maintTotal - interestExpense - (fixedCost * taxSubsidized);
            
            // 💡 確保核心營運營收正確寫入全域變數，以供倒推並渲染現金流明細
            revenue = rentRevTotal;
        }

        // 8. 風電水下基礎與材料製造商 (wind_materials)
        else if (corp.bizModel === 'wind_materials') {
            let epcConstructionCost = 0;
            let tailValueRev = 0;

            const interestRate = (app.state && app.state.interestRate) ? app.state.interestRate : 0.05;

            for (let jacket of state.jacketProjects) {
                if (jacket.phase === 'epc') {
                    // 進度推進受焊接技術等級加成
                    let baseInc = 1.6 * ((state.weldingQualityLvl || 1) / 3 + 0.67);
                    jacket.progress = Math.min(100, jacket.progress + baseInc);
                    
                    let dailyCapEx = jacket.capExNeeded / 60; // 基礎 60 天工期
                    
                    // 良率低下重工懲罰
                    let reworkCost = 0;
                    if ((state.weldingQualityLvl || 1) === 1 && Math.random() < 0.20) {
                        reworkCost = dailyCapEx * 0.40; // 焊接氣孔重工，多浪費 40% 的當天建設開銷
                    }
                    
                    epcConstructionCost += (dailyCapEx * 0.8 + reworkCost);
                    
                    let interestExpense = (jacket.capExNeeded * 0.8) * (interestRate / 365);
                    dailyProfit -= interestExpense;
                    
                    if (jacket.progress >= 100) {
                        jacket.phase = 'om'; // 出貨
                    }
                } else if (jacket.phase === 'om') {
                    // 一次性認領高額出貨尾款毛利
                    tailValueRev += jacket.contractValue * 0.35; // 35% 出貨認列毛利
                    jacket.isCompleted = true;
                    
                    corp.companyNews.push({
                        date: app.formatDateStr(app.state.date).substring(5),
                        msg: `【重裝出港】承造水下 Jacket 鋼構基礎項目順利完工！出港並併網認列一次性大額尾款淨利 TWD $${app.formatMoney(jacket.contractValue * 0.35)}！`,
                        isGood: true
                    });
                    app.log(`【水下基礎出貨】${corp.name} 風電 Jacket 鋼構基礎完工出港，認列尾款毛利！`, 'text-green-400 font-bold');
                }
            }

            // 移除已完工的項目
            state.jacketProjects = state.jacketProjects.filter(j => !j.isCompleted);

            // 扣除重裝組裝開銷
            if (epcConstructionCost > 0) {
                corp.corporateCash = Math.max(0, corp.corporateCash - epcConstructionCost);
            }

            let fixedCost = Number(state.capacity) * 2000;
            dailyProfit = dailyProfit + tailValueRev - (fixedCost * taxSubsidized);
        }

        // ==========================================
        // 營收與現金結算防護 (防範 NaN 異常)
        // ==========================================
        dailyProfit = Number(dailyProfit) || 0;
        
        // 自創與非自創股票物件結算
        corp.corporateCash = (Number(corp.corporateCash) || 0) + dailyProfit;
        corp.lastDailyProfit = dailyProfit; // 用於面板展示

        // 💡 倒推核心營運日常收益與日常開銷
        let finalRev = Number(revenue) || 0;
        if (corp.bizModel === 'cement_kiln' && typeof govSubsidy !== 'undefined') finalRev += govSubsidy;
        if (corp.bizModel === 'wind_materials' && typeof tailValueRev !== 'undefined') finalRev += tailValueRev;
        
        let finalExp = finalRev - dailyProfit;
        if (finalExp < 0) finalExp = 0;
        
        corp.lastDailyRev = finalRev;
        corp.lastDailyExp = finalExp;

        // 避免帳上現金為負，自動進入債務融資
        if (corp.corporateCash < 0) {
            let debtAmount = Math.abs(corp.corporateCash);
            corp.corporateCash = 0;
            corp.corporateDebt = (Number(corp.corporateDebt) || 0) + debtAmount;
            
            if (corp.isPlayerFounded) {
                app.log(`【債務預警】${corp.name} 因今日營運赤字虧損，自動向銀行透支融資借貸 TWD $${app.formatMoney(debtAmount)}！`, 'text-red-500 font-bold');
            }
        }
    }
};

// 全域掛載
window.CEO_ENERGY = CEO_ENERGY;
