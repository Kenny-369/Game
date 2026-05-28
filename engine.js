const app = {
            state: {
                selectedDiff: 'normal', selectedIdentity: 'middle', diffParams: null, date: new Date(1988, 0, 1), money: 0, lockedMargin: 0,hospitalizedDays: 0,
                yearRevenue: 0, yearDeductions: 0, realizedGains: 0, auditRisk: 0.0, pendingTax: 0, taxDiscount: 0, evadedTaxAmount: 0, insiderPenalty: 0,
                health: 100, satiety: 80, happiness: 50, stress: 0, comfort: 0, currentMeal: 'normal', residence: { type: 'none', id: null, instanceId: null },
                marketIndex: 21500, marketIndexLast: 21500, fundamentalValue: 21500, inflationRate: 0.02, marketState: 'bull', bubbleIndex: 0, baseRate: 0.025, vix: 15.0, scheduledNews: null,  
                cbObservation: { type: null, days: 0, delayTo: 7 }, cbStance: 'neutral', cbActionCooldown: 0, contagionQueue: [], activeRotations: [], priceMultiplier: 1.0, currentBaseDailyCost: 3000,
                stocks: [], ipoCooldown: 5, accounts: {}, portfolioRE: [], portfolioLuxury: [], calendarEvents: [], activeLoans: [], history: [], chartTarget: 'index', chartPeriod: 30, customChartStocks: [],
                currentTrade: null, currentBankForFD: null, loanApplyContext: null, isGameOver: false, isProcessingDay: false, currentLiquidationUpdate: null, SCFI: 1500, jetFuelPrice: 85, oilPrice: 80.0, prevOilPrice: 80.0, carbonTaxRate: 300.0
            },
            formatDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; },
            formatMoney(n) { return Math.floor(n).toLocaleString('en-US'); },
            selectIdentity(role) {
                this.state.selectedIdentity = role;
                document.querySelectorAll('.btn-money').forEach(btn => btn.classList.remove('selected'));
                // 加上安全判斷：確認該按鈕元素存在於 DOM 中才添加 CSS 樣式
                const targetBtn = document.getElementById(`btn-money-${role}`);
                if (targetBtn) {
                    targetBtn.classList.add('selected');
                }
            },
            selectDifficulty(level) {
                this.state.selectedDiff = level;
                document.querySelectorAll('.btn-diff').forEach(btn => btn.classList.remove('selected'));
                document.getElementById(`btn-diff-${level}`).classList.add('selected');
                const p = DIFFICULTIES[level];
                document.getElementById('diff-desc').innerHTML = `
                    <div><span class="text-gray-400">初始負債:</span> <span class="${p.initDebt>0?'text-red-500':'text-green-500'}">$${this.formatMoney(p.initDebt)}</span></div>
                    <div><span class="text-gray-400">資本利得稅:</span> <span class="text-yellow">依所得累進 (0~50%)</span></div>
                    <div><span class="text-gray-400">交易手續費:</span> <span class="text-yellow">${(p.feeRate*100).toFixed(1)}%</span></div>
                    <div><span class="text-gray-400">壓力倍率:</span> <span class="text-magenta">x${p.stressMult.toFixed(1)}</span></div>`;
            },
            updateBankRates() {
                const currentBase = this.state.baseRate;
                DB.banks.forEach((b, idx) => {
                    const baseBank = DB.baseBanks[idx];
                    if (b.id !== 'B3') { b.depositRate = Math.max(0.001, currentBase + (baseBank.depositRate - 0.025)); b.fdRate = Math.max(0.002, currentBase + (baseBank.fdRate - 0.025)); }
                    b.products.forEach((p, pIdx) => { p.currentRate = Math.max(0.01, currentBase + baseBank.products[pIdx].margin) * this.state.diffParams.loanMult; });
                });
                this.state.activeLoans.forEach(loan => {
                    const bankDef = DB.baseBanks.find(x => x.id === loan.bankId); const prodDef = bankDef.products.find(x => x.id === loan.productId);
                    loan.currentRate = Math.max(0.01, currentBase + prodDef.margin) * this.state.diffParams.loanMult;
                });
            },
            getCompanyDesc(s) {
                // 如果有在 desc.js 中量身定做的簡介，就優先使用
                if (typeof COMPANY_DESC !== 'undefined' && COMPANY_DESC[s.id]) {
                    return COMPANY_DESC[s.id];
                }
                // 如果沒有，則使用動態生成的通用簡介作為備案
                const sectorDef = DB.sectors[s.sector];
                const riskLevel = s.beta > 1.5 ? '高波動風險' : (s.beta < 0.8 ? '穩健防禦型' : '一般波動');
                const liqLevel = s.liquidity > 200000 ? '極高' : (s.liquidity > 80000 ? '中等' : '偏低');
                return `${s.name} 是一間隸屬於「${sectorDef.name}」板塊的指標企業。市場流動性評級為 ${liqLevel}，屬${riskLevel}資產。營運受全球 ${sectorDef.name} 產業趨勢與總體經濟利率政策高度影響。`;
            },

            openCompanyInfo(idx) {
                this.state.currentCompanyIdx = idx;
                const s = this.state.stocks[idx];
                const sectorDef = DB.sectors[s.sector];
                
                document.getElementById('ci-name').innerText = s.name;
                document.getElementById('ci-id').innerText = s.id;
                document.getElementById('ci-sector').innerText = sectorDef ? sectorDef.name : '未知';
                document.getElementById('ci-desc').innerText = this.getCompanyDesc(s);
                
                const totalSharesDisplay = s.totalShares ? (s.totalShares >= 100000000 ? (s.totalShares / 100000000).toFixed(2) + ' 億' : (s.totalShares / 10000).toFixed(0) + ' 萬') : '未知';
                document.getElementById('ci-total-shares').innerText = totalSharesDisplay + ' 股';
                document.getElementById('ci-price').innerText = `$${this.formatMoney(s.price)}`;

                // --- 計算並寫入基本面與估值數據 ---
                const isTech = ['semi', 'electronics', 'software_ai'].includes(s.sector);
                const isFinance = s.sector === 'finance';
                
                // 用股票 ID 的字元碼與當前月份來產生穩定的基數 (確保同月點開同一檔股票時，財報數字不會亂跳)
                let charSum = 0;
                for(let i=0; i<s.id.length; i++) charSum += s.id.charCodeAt(i);
                let pseudoSeed = (charSum + this.state.date.getMonth() + this.state.date.getFullYear()) % 100; // 0~99
                
                // 1. 估值與 EPS 計算 (將當前價格對比歷史基準來計算合理的估值波動)
                let priceRatio = s.price / (s.basePrice || s.price);
                let basePe = isTech ? 20 : (isFinance ? 10 : 15);
                let peRatio = basePe * priceRatio * (0.8 + (s.beta * 0.2)) + (pseudoSeed / 10);
                if(peRatio < 5) peRatio = 5 + (pseudoSeed / 20); // 打底保護
                
                let eps = s.price / peRatio;
                let pbRatio = (peRatio / (isTech ? 6 : 10)) * (1 + pseudoSeed / 200);
                
                // 2. 歷史動能與營收成長 (抓取 30 天前的紀錄，若無則用 basePrice)
                const slice = this.state.history.slice(-30);
                let price30DaysAgo = slice.length > 0 ? (slice[0].stocks[s.id] || s.price) : s.price;
                let momentum = (s.price - price30DaysAgo) / price30DaysAgo;
                
                let momValue = momentum * 100 + (pseudoSeed % 5 - 2.5); // 將股價動能與月營收掛鉤
                let yoyValue = (priceRatio - 1) * 100 + (pseudoSeed % 10 - 5);  // 將長期漲幅與年營收掛鉤
                
                // 3. 獲利三率 (根據產業特性給予基準，科技業高毛利、金融業特規)
                let gm = isTech ? (35 + s.beta * 5 + pseudoSeed % 10) : (isFinance ? '-' : (15 + s.beta * 5 + pseudoSeed % 8));
                let om = isFinance ? '-' : (gm * (0.5 + (pseudoSeed % 20)/100));
                let nm = isFinance ? (25 + s.beta * 5 + pseudoSeed % 15) : (om * (0.7 + (pseudoSeed % 10)/100));
                
                // 4. 成交量 (加入市場總體恐慌指標 VIX 影響動能)
                let dailyVol = Math.floor((s.liquidity || 50000) * (0.5 + Math.random() * (this.state.vix / 15)));

                // 5. 渲染寫入 UI
                document.getElementById('ci-pe').innerText = peRatio.toFixed(1) + ' 倍';
                document.getElementById('ci-pb').innerText = pbRatio.toFixed(2) + ' 倍';
                document.getElementById('ci-eps').innerText = `$${eps.toFixed(2)}`;
                document.getElementById('ci-vol').innerText = this.formatMoney(dailyVol) + ' 股';
                
                document.getElementById('ci-mom').innerHTML = `<span class="${momValue >= 0 ? 'text-red-retro' : 'text-cyan'}">${momValue >= 0 ? '▲' : '▼'} ${Math.abs(momValue).toFixed(1)}%</span>`;
                document.getElementById('ci-yoy').innerHTML = `<span class="${yoyValue >= 0 ? 'text-red-retro' : 'text-cyan'}">${yoyValue >= 0 ? '▲' : '▼'} ${Math.abs(yoyValue).toFixed(1)}%</span>`;
                
                document.getElementById('ci-gm').innerText = isFinance ? '-' : gm.toFixed(1) + '%';
                document.getElementById('ci-om').innerText = isFinance ? '-' : om.toFixed(1) + '%';
                document.getElementById('ci-nm').innerText = isFinance ? nm.toFixed(1) + '%' : nm.toFixed(1) + '%';

                const bulletinBoard = document.getElementById('ci-bulletin-board');
                if (s.companyNews && s.companyNews.length > 0) {
                    let newsHtml = '';
                    // 反轉陣列讓最新的在最上面
                    [...s.companyNews].reverse().forEach(news => {
                        let colorClass = news.isGood ? 'text-red-400' : 'text-cyan';
                        newsHtml += `<div class="border-b border-gray-800 pb-1"><span class="text-gray-500">${news.date}</span> <span class="${colorClass}">${news.msg}</span></div>`;
                    });
                    bulletinBoard.innerHTML = newsHtml;
                } else {
                    bulletinBoard.innerHTML = '<div class="text-gray-500 text-center mt-4">目前尚無重大公告。</div>';
                }

                const ownSec = document.getElementById('ci-ownership-section');
                if (s.owned > 0 || s.shortOwned > 0) {
                    ownSec.classList.remove('hidden');
                    document.getElementById('ci-owned').innerText = this.formatMoney(s.owned);
                    document.getElementById('ci-short').innerText = this.formatMoney(s.shortOwned);
                    
                    if (s.owned > 0) {
                        const pct = (s.owned / (s.totalShares || 100000000)) * 100;
                        document.getElementById('ci-owned-pct').innerText = `占 ${pct < 0.00001 ? '< 0.00001' : pct.toFixed(5)}%`;
                    } else { document.getElementById('ci-owned-pct').innerText = '占 0%'; }
                    
                    if (s.shortOwned > 0) {
                        const pct = (s.shortOwned / (s.totalShares || 100000000)) * 100;
                        document.getElementById('ci-short-pct').innerText = `占 ${pct < 0.00001 ? '< 0.00001' : pct.toFixed(5)}%`;
                    } else { document.getElementById('ci-short-pct').innerText = '占 0%'; }
                } else {
                    ownSec.classList.add('hidden');
                }

                const currentPct = s.totalShares ? ((s.owned / s.totalShares) * 100) : 0;
                document.getElementById('ci-board-pct').innerText = `${currentPct < 0.00001 ? '< 0.00001' : currentPct.toFixed(4)}%`;
                document.getElementById('ci-board-role').innerText = s.playerRole || '散戶';
                
                // 根據持股比例解鎖按鈕
                const btnProxy = document.getElementById('btn-proxy-fight');
                const btnCeo = document.getElementById('btn-ceo-ops');
                
                if (currentPct >= 30 && currentPct < 50) {
                    btnProxy.disabled = false; btnProxy.classList.replace('border-gray-600', 'border-yellow'); btnProxy.classList.replace('text-gray-600', 'text-yellow');
                    btnProxy.innerText = '發動委託書大戰 (奪取經營權)';
                } else {
                    btnProxy.disabled = true; btnProxy.classList.replace('border-yellow', 'border-gray-600'); btnProxy.classList.replace('text-yellow', 'text-gray-600');
                    btnProxy.innerText = currentPct >= 50 ? '已取得經營權' : '發動委託書大戰 (需持股 30%)';
                }

                const isCEO = s.playerRole && s.playerRole.includes('CEO');
                const isChairman = s.playerRole && s.playerRole.includes('董事長');
                const hasControl = s.hasDeclared?.pct50 || currentPct >= 50;

                // 升級體驗：執行長進入全功能營運；董事長進入唯讀監控模式
                if (isCEO) {
                    btnCeo.disabled = false; 
                    btnCeo.classList.replace('border-gray-600', 'border-red-400'); 
                    btnCeo.classList.replace('text-gray-600', 'text-red-400');
                    btnCeo.innerText = '進入公司營運面板 (CEO 專屬)';
                    btnCeo.onclick = () => { 
                        app.closeModal('company'); 
                        CEO_MODULE.openDashboard(idx); 
                        app.switchTab('ceo', document.getElementById('nav-ceo-tab'));
                    };
                } else if (isChairman || hasControl) {
                    btnCeo.disabled = false; 
                    btnCeo.classList.replace('border-gray-600', 'border-yellow'); 
                    btnCeo.classList.replace('text-gray-600', 'text-yellow');
                    btnCeo.innerText = '進入公司營運面板 (董事長唯讀監控)';
                    btnCeo.onclick = () => { 
                        app.closeModal('company'); 
                        CEO_MODULE.openDashboard(idx); 
                        app.switchTab('ceo', document.getElementById('nav-ceo-tab'));
                    };
                } else {
                    btnCeo.disabled = true; 
                    btnCeo.classList.replace('border-red-400', 'border-gray-600'); 
                    btnCeo.classList.replace('text-red-400', 'text-gray-600');
                    btnCeo.classList.replace('border-yellow', 'border-gray-600'); 
                    btnCeo.classList.replace('text-yellow', 'text-gray-600');
                    btnCeo.innerText = '進入公司營運面板 (尚未解鎖)';
                }
                
                this.renderModalChart(s.id);
                this.switchCompanyTab('info'); // 每次打開強制預設切回基本資訊
                
                // --- [關鍵修正] 融合獵頭功能與經理人團隊顯示 ---
                const ceo = s.currentCEO;
                const ceoDisplay = document.getElementById('ceo-detail-display');
                
                if (ceoDisplay) {
                    // 1. 組合 CEO 特質 HTML
                    let traitsHtml = '';
                    if (ceo && ceo.traits) {
                        ceo.traits.forEach(tKey => {
                            const t = CEO_CONFIG.traits[tKey];
                            if (t) {
                                const color = t.isBad ? 'text-red-400 border-red-900' : 'text-yellow border-yellow-900';
                                traitsHtml += `<div class="border ${color} p-2 bg-black bg-opacity-40 mb-2">
                                    <div class="font-bold text-xs">【${t.name}】</div>
                                    <div class="text-[10px] opacity-80">${t.desc}</div>
                                </div>`;
                            }
                        });
                    }

                    // 2. 組合經理人團隊 (C-Level) HTML
                    let teamHtml = '';
                    if (s.employees) {
                        const roles = { 'cto': '技術長 (CTO)', 'cmo': '行銷長 (CMO)', 'cfo': '財務長 (CFO)' };
                        Object.entries(roles).forEach(([key, label]) => {
                            const emp = s.employees[key];
                            if (emp) {
                                const t = CEO_CONFIG.traits[emp.trait];
                                teamHtml += `
                                    <div class="border border-green-900 bg-black bg-opacity-40 p-2 mb-2 flex justify-between items-center">
                                        <div>
                                            <div class="text-[11px] text-green-400 font-bold">${label}: ${emp.name}</div>
                                            <div class="text-[10px] text-gray-400">能力評分: <span class="text-white">${emp.skill}</span> | 特質: <span class="text-yellow">${t ? t.name : '無'}</span></div>
                                        </div>
                                        <div class="text-right text-[10px] text-cyan">
                                            ${emp.payType === 'cash' ? `$${app.formatMoney(emp.salary)}/月` : `${app.formatMoney(emp.stockDemand)}股/月`}
                                        </div>
                                    </div>`;
                            }
                        });
                    }
                    if (teamHtml) {
                        teamHtml = `<div class="mt-4 border-t border-cyan-900 pt-3"><div class="text-[11px] text-cyan mb-2 font-bold tracking-widest">經營團隊 (EXECUTIVE TEAM)</div>${teamHtml}</div>`;
                    }

                    // 3. [恢復並增強] 董事長人事權與獵頭 UI 邏輯
                    let actionBtnHtml = '';
                    if (hasControl) {
                        const costHeadhunter = Math.floor(2000000 * app.state.priceMultiplier);
                        
                        // 獵頭候選人清單 HTML
                        let headhunterHtml = '';
                        if (s.headhunterCandidates && s.headhunterCandidates.length > 0) {
                            headhunterHtml = `<div class="mt-4 border-t border-cyan-900 pt-3"><div class="text-xs text-cyan font-bold mb-2">🤝 獵人頭公司推薦名單：</div><div class="grid grid-cols-1 gap-3">`;
                            s.headhunterCandidates.forEach(c => {
                                let cTraits = '';
                                c.traits.forEach(tk => { const t = CEO_CONFIG.traits[tk]; if(t) cTraits += `<span class="${t.isBad?'text-red-400':'text-yellow'} mr-1">【${t.name}】</span>`; });
                                headhunterHtml += `
                                    <div class="bg-black border border-cyan-800 p-3 flex flex-col justify-between shadow-[0_0_10px_rgba(0,255,255,0.05)]">
                                        <div class="flex justify-between items-center border-b border-cyan-900 pb-1 mb-2"><span class="font-bold text-white">${c.name} (${c.age}歲)</span><span class="text-green-400 text-xs font-bold">$${app.formatMoney(c.salary)}</span></div>
                                        <div class="grid grid-cols-5 gap-1 text-[10px] text-center mb-2 bg-gray-900 p-1">
                                            <div>領 <span class="text-white block font-bold text-xs">${c.stats.leadership}</span></div><div>研 <span class="text-white block font-bold text-xs">${c.stats.rd}</span></div><div>財 <span class="text-white block font-bold text-xs">${c.stats.finance}</span></div><div>銷 <span class="text-white block font-bold text-xs">${c.stats.marketing}</span></div><div>營 <span class="text-white block font-bold text-xs">${c.stats.operations}</span></div>
                                        </div>
                                        <div class="text-[10px] text-gray-400 mb-3">特質: ${cTraits || '無'}</div>
                                        <button class="btn-retro w-full py-1.5 text-xs border-green-500 text-green-400 hover:bg-green-900" onclick="app.hireHeadhunterCEO(${idx}, '${c.id}')">聘任此人為 CEO</button>
                                    </div>`;
                            });
                            headhunterHtml += `</div><button class="btn-retro w-full mt-3 py-1 text-[10px] text-gray-500 border-gray-800" onclick="app.cancelHeadhunter(${idx})">關閉推薦名單</button></div>`;
                        }

                        actionBtnHtml = `
                            <div class="mt-4 border-t border-yellow-900 pt-3">
                                <div class="text-[10px] text-yellow mb-2 text-center font-bold">💡 董事長人事權：您可以隨時更替或委託獵頭</div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    ${s.playerRole !== 'CEO' ? `<button class="btn-retro px-2 py-2 text-xs border-red-500 text-red-500 hover:bg-red-900 font-bold animate-pulse" onclick="app.takeOverCEO(${idx})">由我親自兼任 CEO</button>` : `<button class="btn-retro px-2 py-2 text-xs border-gray-700 text-gray-600 cursor-not-allowed" disabled>您正兼任執行長</button>`}
                                    <button class="btn-retro px-2 py-2 text-xs border-cyan text-cyan hover:bg-cyan-900 font-bold" onclick="app.triggerHeadhunter(${idx}, ${costHeadhunter})">委託獵頭尋才 (-$${app.formatMoney(costHeadhunter)})</button>
                                </div>
                                ${(ceo && !ceo.isPlayer) ? `<button class="btn-retro px-2 py-1 text-[10px] border-yellow text-yellow hover:bg-yellow-900 w-full mt-2" onclick="app.fireCurrentCEO(${idx})">解雇現任 CEO (保留空缺)</button>` : ''}
                                ${headhunterHtml}
                            </div>`;
                    }

                    // 4. 最終 UI 渲染
                    if (ceo) {
                        const subtitle = ceo.isPlayer ? '現任執行長 (由您親自兼任)' : '現任執行長 (CHIEF EXECUTIVE OFFICER)';
                        ceoDisplay.innerHTML = `
                            <div class="bg-gradient-to-b from-gray-900 to-black border border-yellow-600 p-4 mb-4">
                                <div class="flex justify-between items-start border-b border-yellow-900 pb-2 mb-3">
                                    <div><div class="text-xl font-bold text-white">${ceo.name} <span class="text-xs text-gray-500 font-normal">(${ceo.age}歲)</span></div><div class="text-[10px] text-yellow mt-1 tracking-widest">${subtitle}</div></div>
                                    <div class="text-right"><div class="text-[10px] text-gray-500">年度薪酬方案</div><div class="text-green-400 font-bold">$${app.formatMoney(ceo.salary)}</div></div>
                                </div>
                                <div class="grid grid-cols-1 gap-3">
                                    <div><div class="text-[11px] text-cyan mb-2 border-b border-cyan-900 pb-1 font-bold">能力評分表 (STATS)</div><div class="space-y-2">${Object.entries({ 'leadership': '領導力', 'rd': '研發力', 'finance': '財務力', 'marketing': '行銷力', 'operations': '營運力' }).map(([key, label]) => { const val = ceo.stats[key]; const color = val >= 85 ? 'bg-yellow-500' : (val >= 70 ? 'bg-green-500' : 'bg-cyan-600'); return `<div class="flex items-center gap-2"><span class="text-[10px] w-12 text-gray-400">${label}</span><div class="flex-1 h-1.5 bg-gray-800 border border-gray-700"><div class="h-full ${color}" style="width: ${val}%"></div></div><span class="text-[10px] w-6 text-right ${val >= 85 ? 'text-yellow' : 'text-white'}">${val}</span></div>`; }).join('')}</div></div>
                                    <div class="mt-2"><div class="text-[11px] text-magenta mb-2 border-b border-magenta pb-1 font-bold">人物特性 (TRAITS)</div>${traitsHtml || '<div class="text-xs text-gray-600 italic">無顯著特性</div>'}</div>
                                </div>
                                ${teamHtml}
                                ${actionBtnHtml}
                            </div>`;
                    } else {
                        ceoDisplay.innerHTML = `
                            <div class="bg-gray-900 bg-opacity-40 border border-dashed border-gray-800 p-8 text-center mb-4"><div class="text-gray-500 italic mb-4">目前執行長職位空缺中，請儘速指派或委任獵頭。</div>${teamHtml}${actionBtnHtml}</div>`;
                    }
                }
                // --- 渲染結束 ---

                this.renderModalChart(s.id);
                this.switchCompanyTab('info');
                document.getElementById('modal-company').classList.remove('hidden');
            },
renderModalChart(stockId) {
                const canvas = document.getElementById('modal-price-chart');
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                const width = canvas.width;
                const height = canvas.height;
                
                // 清空畫布
                ctx.clearRect(0, 0, width, height);

                // 取得遊戲系統中最近 30 天的歷史紀錄
                const slice = this.state.history.slice(-30);
                if (slice.length === 0) return;

                // 萃取該檔股票的價格歷史
                let data = slice.map(h => h.stocks[stockId] || 0).filter(v => v > 0);
                
                if (data.length === 0) {
                    ctx.fillStyle = '#33ff33'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText('尚無足夠歷史交易資料', width/2, height/2);
                    document.getElementById('ci-high').innerText = '-';
                    document.getElementById('ci-low').innerText = '-';
                    return;
                }

                // 計算最高與最低價
                const maxPrice = Math.max(...data);
                const minPrice = Math.min(...data);
                
                // 將高低價更新到介面上
                document.getElementById('ci-high').innerText = `$${this.formatMoney(maxPrice)}`;
                document.getElementById('ci-low').innerText = `$${this.formatMoney(minPrice)}`;

                // 計算繪圖比例縮放 (留出一點天地邊距)
                let minVal = minPrice; let maxVal = maxPrice;
                if (minVal === maxVal) { maxVal *= 1.1; minVal *= 0.9; }
                const range = maxVal - minVal;
                minVal -= range * 0.1; maxVal += range * 0.1;
                const newRange = maxVal - minVal || 1;

                const padL = 0, padR = 0, padT = 5, padB = 5;
                const drawW = width - padL - padR;
                const drawH = height - padT - padB;
                const stepX = drawW / Math.max(1, data.length - 1);

                // 開始畫線段
                ctx.beginPath();
                ctx.strokeStyle = '#33ff33'; // 經典終端機螢光綠
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';
                
                data.forEach((val, i) => {
                    let x = padL + i * stepX;
                    let y = height - padB - ((val - minVal) / newRange) * drawH;
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.stroke();

                // 畫底部的半透明漸層特效
                ctx.lineTo(padL + drawW, height - padB);
                ctx.lineTo(padL, height - padB);
                ctx.closePath();
                const gradient = ctx.createLinearGradient(0, padT, 0, height - padB);
                gradient.addColorStop(0, 'rgba(51, 255, 51, 0.4)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.fill();
            },
            startGame() {
                this.state.diffParams = DIFFICULTIES[this.state.selectedDiff];
                const diff = this.state.diffParams;
                this.state.priceMultiplier = 1.0; this.state.currentBaseDailyCost = diff.baseDailyCost;
                DB.banks = JSON.parse(JSON.stringify(DB.baseBanks)); this.updateBankRates(); 
                DB.banks.forEach(b => { this.state.accounts[b.id] = { deposit: 0 }; });
                
                const playerName = document.getElementById('start-player-name').value || "無名大亨";
                this.state.money = parseFloat(document.getElementById('start-money').value) || 0;
                
                // 更新 UI 玩家名稱
                const playerNameEl = document.getElementById('ui-player-name');
                if (playerNameEl) playerNameEl.textContent = playerName;

                // 處理房屋邏輯
                const mode = document.getElementById('start-residence-mode').value;
                const houseId = mode === 'rent' ? document.getElementById('start-residence-rent').value : document.getElementById('start-residence-own').value;
                
                const houseData = DB.realEstate.find(r => r.id === houseId);
                if (houseData) {
                    if (mode === 'rent') {
                        this.state.residence = { type: 'rent', id: houseId, instanceId: null };
                    } else {
                        const instId = 'I_' + Date.now() + '_1';
                        this.state.residence = { type: 'own', id: houseId, instanceId: instId };
                        // 將買斷的房屋加入資產清單
                        this.state.portfolioRE.push({ instanceId: instId, id: houseId, buyPrice: houseData.price });
                    }
                }
                
                if (diff.initDebt > 0) {
                    // 動態去資料庫抓取地下錢莊(B3)的高利貸(L4)設定，確保開局利率與 UI 完美同步
                    const yakuzaProd = DB.baseBanks.find(b => b.id === 'B3').products.find(p => p.id === 'L4');
                    const loanRate = Math.max(0.01, this.state.baseRate + yakuzaProd.margin) * diff.loanMult;
                    
                    const dueDate = new Date(this.state.date); dueDate.setDate(dueDate.getDate() + 30);
                    this.state.activeLoans.push({ id: 'INIT_LOAN', bankId: 'B3', productId: 'L4', type: 'yakuza', name: '地獄開局債務', principal: diff.initDebt, currentRate: loanRate, startDate: new Date(this.state.date), dueDate: dueDate, collateralType: null, collateralId: null, collateralName: '無擔保' });
                }
                DB.realEstate.forEach(r => { 
                    r.basePrice = r.price; 
                    r.baseRent = r.rent; 
                    r.hazardProb = r.hazardProb * 0.3; // 👈 加上這行，將事故機率大幅降低至原本的 20%
                }); 
                DB.luxury.forEach(l => { l.basePrice = l.price; });
                document.getElementById('ui-diff-label').innerText = diff.name.split(' ')[0]; document.getElementById('ui-fee-rate').innerText = `${(diff.feeRate*100).toFixed(1)}%`;
                
                DB.unlistedPool.forEach(s => {
                    s.owned = 0; s.avgCost = 0; s.shortOwned = 0; s.shortAvgPrice = 0; s.shortMargin = 0; s.spillover = 0; s.isLimitUp = false; s.isLimitDown = false;
                    s.companyNews = []; // 專屬公告欄
                    s.productCooldown = Math.floor(Math.random() * 60) + 15; // 產品發表冷卻時間 (15~75天)
                    
                    // --- [修正補強] 確保初始資料庫裡的企業都有 employees 與基本欄位 ---
                    s.employees = { cto: null, cmo: null, cfo: null };
                    s.corporateCash = s.corporateCash || Math.floor((s.basePrice || 100) * 1000000 * 0.1); 
                    s.hasDeclared = { pct5: false, pct10: false, pct33: false, pct50: false };
                    s.workerCount = s.workerCount || 200; // 確保擁有基礎員工編制
                    
                    // (移至 totalShares 計算後)

                    if (s.id === '2330') s.totalShares = 25930000000; else if (s.id === 'AAPL') s.totalShares = 15300000000; else if (s.id === 'NVDA') s.totalShares = 24600000000;
                    else if (s.id === 'MSFT') s.totalShares = 7430000000; else if (s.id === '2317') s.totalShares = 13860000000; else if (s.id === '2454') s.totalShares = 1599000000;
                    else if (s.id === 'TSLA') s.totalShares = 3180000000; else if (s.id === 'GOOGL') s.totalShares = 12400000000; else if (s.id === 'META') s.totalShares = 2540000000;
                    else if (s.id === 'AMZN') s.totalShares = 10400000000;
                    else {
                        const turnoverRate = 0.005 + (Math.random() * 0.025);
                        s.totalShares = Math.floor((s.liquidity * (10 + Math.random()*20)) / turnoverRate); s.totalShares = Math.max(20000000, s.totalShares);
                    }
                    
                    // --- [新增] 依 bizModel 自動給予資料庫上市公司初始資產，因為需要用到總股本，所以移到此處執行 ---
                    if ((s.sector === 'transport' || s.sector === 'semi' || s.sector === 'pharma' || s.sector === 'finance' || s.sector === 'software_ai' || s.sector === 'telecom' || s.sector === 'electronics' || s.sector === 'realestate' || s.sector === 'auto' || s.sector === 'game' || s.sector === 'retail' || s.sector === 'food' || s.sector === 'energy') && s.bizModel && !s.isPlayerFounded) {
                        if (s.sector === 'semi' && typeof CEO_SEMI !== 'undefined') {
                            CEO_SEMI.initAssets(s);
                        } else if (s.sector === 'pharma' && typeof CEO_PHARMA !== 'undefined') {
                            CEO_PHARMA.initAssets(s);
                        } else if (s.sector === 'finance' && typeof CEO_FINANCE !== 'undefined') {
                            CEO_FINANCE.initAssets(s);
                        } else if (s.sector === 'software_ai' && typeof CEO_SOFTWARE !== 'undefined') {
                            CEO_SOFTWARE.initAssets(s);
                        } else if (s.sector === 'telecom' && typeof CEO_TELECOM !== 'undefined') {
                            CEO_TELECOM.initAssets(s);
                        } else if (s.sector === 'electronics' && typeof CEO_ELECTRONICS !== 'undefined') {
                            CEO_ELECTRONICS.initAssets(s);
                        } else if (s.sector === 'realestate' && typeof CEO_REALESTATE !== 'undefined') {
                            CEO_REALESTATE.initAssets(s);
                        } else if (s.sector === 'auto' && typeof CEO_AUTO !== 'undefined') {
                            CEO_AUTO.initAssets(s);
                        } else if (s.sector === 'game' && typeof CEO_GAME !== 'undefined') {
                            CEO_GAME.initAssets(s);
                        } else if (s.sector === 'transport' && typeof CEO_TRANSPORT !== 'undefined') {
                            CEO_TRANSPORT.initAssets(s);
                        } else if (s.sector === 'retail' && typeof CEO_RETAIL !== 'undefined') {
                            CEO_RETAIL.initAssets(s);
                        } else if (s.sector === 'food' && typeof CEO_FOOD !== 'undefined') {
                            CEO_FOOD.initAssets(s);
                        } else if (s.sector === 'energy' && typeof CEO_ENERGY !== 'undefined') {
                            CEO_ENERGY.initAssets(s);
                        }
                    }
                });
                const initialStockCount = Math.floor(Math.random() * 4) + 3;
                for(let i=0; i<initialStockCount; i++) { this.doIPO(true); }
                this.recordHistory();
                document.getElementById('start-screen').classList.add('hidden'); document.getElementById('game-ui').classList.remove('hidden');
                this.log(`【系統】啟動完成。載入 ${diff.name} 參數。`, 'text-cyan');
                if (typeof CEO_MODULE !== 'undefined' && typeof CEO_MODULE.rollBusinessCycle === 'function') {
                    CEO_MODULE.rollBusinessCycle(this.state.date.getFullYear());
                }
                this.renderMealPlan(); this.updateDynamicPricesUI(); this.updateUI(); this.renderMarket(); this.renderMarginMarket(); this.renderBankAndAssets(); this.renderShopAndAssets(); this.renderCalendar(); this.updateChartSelect();
            },
            toggleResidenceFields() {
                const mode = document.getElementById('start-residence-mode').value;
                document.getElementById('start-residence-rent-container').classList.toggle('hidden', mode !== 'rent');
                document.getElementById('start-residence-own-container').classList.toggle('hidden', mode !== 'own');
            },

            // [新增] 自動從資料庫填充初始房屋選單
            populateInitialHousing() {
                const rentSelect = document.getElementById('start-residence-rent');
                const ownSelect = document.getElementById('start-residence-own');
                
                rentSelect.innerHTML = '';
                ownSelect.innerHTML = '';

                // 使用 DB.realEstate 陣列來填充
                DB.realEstate.forEach(house => {
                    const opt = document.createElement('option');
                    opt.value = house.id;
                    if (house.isRent) {
                        opt.textContent = `${house.name} (月租 $${this.formatMoney(house.rent || house.price)})`;
                        rentSelect.appendChild(opt);
                    } else {
                        opt.textContent = `${house.name} (價值 $${this.formatMoney(house.price)})`;
                        ownSelect.appendChild(opt);
                    }
                });
            },
            renderMealPlan() {
                const sel = document.getElementById('meal-plan'); 
        const p = this.state.priceMultiplier; 
        const currentVal = this.state.currentMeal;
        
        // 自動從 MEALS 資料庫換算通膨後的餐飲價格
        const costCheap = Math.floor(MEALS['cheap'].cost * p);
        const costNormal = Math.floor(MEALS['normal'].cost * p);
        const costLuxury = Math.floor(MEALS['luxury'].cost * p);

        sel.innerHTML = `
            <option value="skip" ${currentVal==='skip'?'selected':''}>餓肚子 ($0) - 飽食-20, 幸福-10, 健康-5</option>
            <option value="cheap" ${currentVal==='cheap'?'selected':''}>超商食品/便當 ($${this.formatMoney(costCheap)}) - 飽食+30</option>
            <option value="normal" ${currentVal==='normal'?'selected':''}>一般外食/簡餐 ($${this.formatMoney(costNormal)}) - 飽食+60, 幸福+2</option>
            <option value="luxury" ${currentVal==='luxury'?'selected':''}>高級餐廳/大餐 ($${this.formatMoney(costLuxury)}) - 飽食+100, 幸福+10, 健康+2</option>`;
            
        document.getElementById('ui-daily-cost').innerText = `$ ${this.formatMoney(this.state.currentBaseDailyCost + Math.floor(MEALS[currentVal].cost * p))}`;
    },
            setMealPlan(val) { this.state.currentMeal = val; this.renderMealPlan(); },
            renderResidenceInfo() {
                const container = document.getElementById('ui-residence-info'); if (!container) return;
                if (this.state.residence.type === 'none') {
                    container.innerHTML = `<span class="text-red-500 font-bold animate-pulse">無家可歸 (露宿街頭)</span><div class="text-xs text-gray-400 mt-1">每週結算: 健康 -5, 幸福 -15, 壓力 +20</div>`;
                } else {
                    const def = DB.realEstate.find(r => r.id === this.state.residence.id); if (!def) return;
                    const typeStr = this.state.residence.type === 'own' ? '<span class="text-green-400 ml-2">(自有資產)</span>' : '<span class="text-yellow ml-2">(承租中)</span>';
                    const w = def.weekly; const hpStr = w.hp >= 0 ? `+${w.hp}` : w.hp; const hapStr = w.hap >= 0 ? `+${w.hap}` : w.hap; const strStr = w.str > 0 ? `+${w.str}` : (w.str === 0 ? '0' : w.str);
                    const hazardColor = def.hazardProb > 0.03 ? 'text-red-500' : (def.hazardProb < 0.01 ? 'text-cyan' : 'text-green-400');
                    container.innerHTML = `<span class="font-bold text-white text-lg">${def.name}</span> ${typeStr}<div class="text-xs text-gray-400 mt-1">每週影響: 健康 ${hpStr}, 幸福 ${hapStr}, 壓力 ${strStr}</div><div class="text-[10px] text-gray-500 mt-1">維護狀況: <span class="${hazardColor}">${def.condition}</span> (突發事故率 ${(def.hazardProb*100).toFixed(1)}%/日)</div>`;
                }
            },
            updateDynamicPricesUI() {
        const p = this.state.priceMultiplier; const fm = this.formatMoney;
        // 更新 UI 介面上的薪水與夜生活按鈕金額
        if(document.getElementById('ui-salary-work')) document.getElementById('ui-salary-work').innerText = `+$ ${fm(Math.floor(2000 * p))}`;
        if(document.getElementById('ui-cost-izakaya')) document.getElementById('ui-cost-izakaya').innerText = `-$ ${fm(Math.floor(1000 * p))}`;
        if(document.getElementById('ui-cost-pachinko')) document.getElementById('ui-cost-pachinko').innerText = `-$ ${fm(Math.floor(3000 * p))}`;
        if(document.getElementById('ui-cost-club')) document.getElementById('ui-cost-club').innerText = `-$ ${fm(Math.floor(20000 * p))}`;
        
        // 捐款與買情報的金額保持不變 (維持資本遊戲的規模)
        if(document.getElementById('ui-cost-charity-small')) document.getElementById('ui-cost-charity-small').innerText = `銅級捐贈 (-$${fm(Math.floor(300000 * p))})`;
        if(document.getElementById('ui-cost-charity-medium')) document.getElementById('ui-cost-charity-medium').innerText = `銀級捐贈 (-$${fm(Math.floor(1500000 * p))})`;
        if(document.getElementById('ui-cost-charity-large')) document.getElementById('ui-cost-charity-large').innerText = `金級捐贈 (-$${fm(Math.floor(5000000 * p))})`;
        if(document.getElementById('ui-cost-intel-low')) document.getElementById('ui-cost-intel-low').innerText = `馬路消息 (-$${fm(Math.floor(100000 * p))})`;
        if(document.getElementById('ui-cost-intel-mid')) document.getElementById('ui-cost-intel-mid').innerText = `高層密報 (-$${fm(Math.floor(500000 * p))})`;
        if(document.getElementById('ui-cost-intel-high')) document.getElementById('ui-cost-intel-high').innerText = `絕對內線 (-$${fm(Math.floor(2000000 * p))})`;
    },
            adjustPricesByInflation() {
                let halfYearInf = Math.max(-0.10, Math.min(0.20, this.state.inflationRate / 2)); this.state.priceMultiplier *= (1 + halfYearInf); this.state.currentBaseDailyCost = Math.floor(this.state.diffParams.baseDailyCost * this.state.priceMultiplier);
                DB.realEstate.forEach(re => { re.price = Math.floor(re.basePrice * this.state.priceMultiplier); re.rent = Math.floor(re.baseRent * this.state.priceMultiplier); });
                DB.luxury.forEach(l => { l.price = Math.floor(l.basePrice * this.state.priceMultiplier); });
                this.log(`【物價波動】受總體通膨環境影響，民生物資與實體資產價格調整了 ${halfYearInf >= 0 ? '+' : ''}${(halfYearInf*100).toFixed(1)}%！`, "text-yellow font-bold");
                this.renderMealPlan(); this.updateDynamicPricesUI(); this.renderShopAndAssets();
            },
            doWork() {
        if(this.state.isGameOver) return;
        if(this.state.hospitalizedDays > 0) {
        this.log("【🏥 住院中】無法工作！只能乖乖躺在病床上休養...", "text-yellow");
        this.advanceDay(); // 直接推進一天
        return;
    }
        // 薪水下修至 2000
        const salary = Math.floor(2000 * this.state.priceMultiplier); 
        this.state.money += salary; 
        this.state.stress += 10; 
        this.state.satiety -= 10; 
        this.state.yearRevenue += salary;
        this.log(`【工作】乖乖當了一天社畜，賺取日薪 $${this.formatMoney(salary)}。壓力增加了。`, "text-green-400"); 
        this.advanceDay();
    },

    doLeisure(type) {
        if(this.state.isGameOver) return;
        if(this.state.hospitalizedDays > 0) {
        this.log("【🏥 住院中】無法進行休閒活動！只能乖乖躺在病床上休養...", "text-yellow");
        this.advanceDay(); // 直接推進一天
        return;
    }
        let cost = 0; let stressRelief = 0; let hapBonus = 0; let msg = "";
        switch(type) {
            case 'sleep': cost = 0; stressRelief = 5; hapBonus = 0; msg = "在家睡了一覺，精神稍微恢復。"; break;
            case 'izakaya': cost = 1000; stressRelief = 20; hapBonus = 5; msg = "熱炒店的台啤與快炒撫慰了你。"; break; // 下修至 1000
            case 'pachinko': cost = 3000; stressRelief = Math.random()>0.5 ? 30 : -10; hapBonus = stressRelief>0 ? 10 : -10; msg = stressRelief>0 ? "地下遊藝場贏錢啦！爽！" : "遊藝場狂輸光，越想越氣。"; break; // 下修至 3000
            case 'club': cost = 20000; stressRelief = 100; hapBonus = 30; msg = "在東區高級酒店揮金如土，壓力清零！"; break; // 下修至 20000
        }
        cost = Math.floor(cost * this.state.priceMultiplier); 
        if(cost > 0 && this.state.money < cost) { this.log("現金不足，無法進行該項活動！", "text-red-500"); return; }
        
        this.state.money -= cost; 
        this.state.stress -= stressRelief; 
        this.state.happiness += hapBonus; 
        this.log(`【休閒】${msg}`, "text-cyan"); 
        this.advanceDay(); 
    },
            doCharity(tier) {
                if(this.state.isGameOver) return;
                let cost = 0; let discount = 0; let hapBonus = 0; let msg = "";
                if (tier === 'small') { cost = 300000; discount = 0.02; hapBonus = 2; msg = "進行了小型捐款，提升了社會聲望。"; }
                else if (tier === 'medium') { cost = 1500000; discount = 0.12; hapBonus = 15; msg = "贊助大型慈善晚會，結交了政商名流。"; }
                else if (tier === 'large') { cost = 5000000; discount = 0.50; hapBonus = 60; msg = "成立慈善基金會，獲得極高的避稅特權！"; }
                cost = Math.floor(cost * this.state.priceMultiplier); if(this.state.money < cost) { this.log("現金不足，無法進行該等級的捐款！", "text-red-500"); return; }
                this.state.money -= cost; this.state.taxDiscount = Math.min(1.0, this.state.taxDiscount + discount); this.state.happiness += hapBonus;
                this.log(`【公益】${msg} (年度稅金減免增加 ${Math.floor(discount*100)}%)`, "text-cyan"); this.advanceDay();
            },
            buyInsiderIntel(tier) {
        if(this.state.isGameOver) return;
        if (this.state.scheduledNews) { this.log("你已經買過情報了，等明天市場發酵再說！", "text-yellow"); return; }
        
        let cost = 0; let prob = 0; let modValue = 0; let risk = 0; let tierName = "";
        
        // 大幅下修成功率，反映現實中「內線多半是出貨用的假消息」的險惡
        if (tier === 'low') { cost = 100000; prob = 0.15; modValue = 0.04; risk = 0.05; tierName = "馬路消息"; }
        else if (tier === 'mid') { cost = 500000; prob = 0.35; modValue = 0.08; risk = 0.15; tierName = "高層密報"; }
        else if (tier === 'high') { cost = 2000000; prob = 0.65; modValue = 0.16; risk = 0.30; tierName = "絕對內線"; }
        
        cost = Math.floor(cost * this.state.priceMultiplier); 
        if(this.state.money < cost) { this.log("現金不足以購買情報！", "text-red-500"); return; }
        
        this.state.money -= cost; 
        this.state.auditRisk += risk; 
        this.state.insiderPenalty += cost * 2;
        
        const isSuccess = Math.random() < prob; 
        const availableSectors = [...new Set(this.state.stocks.map(s => s.sector))]; 
        const targetSector = availableSectors[Math.floor(Math.random() * availableSectors.length)];
        const sectorName = DB.sectors[targetSector].name; 
        const isGoodNews = Math.random() > 0.5;
        
        // 【關鍵修改】無論成功或失敗，當下都給出信誓旦旦的情報，誘使玩家去佈局！
        this.log(`【地下交易】支付 $${this.formatMoney(cost)} 後，線人偷偷回報：「明天【${sectorName}】將迎來${isGoodNews ? '重大利多' : '毀滅性利空'}，快去佈局！」（查稅風險 +${Math.floor(risk*100)}%）`, "text-red-500 font-bold");

        if (isSuccess) {
            // 真情報：隔天確實爆發該事件的市場效應
            this.state.scheduledNews = { 
                msg: `【獨家內幕】（${tierName}成真）${sectorName}迎來${isGoodNews ? '重大利多' : '毀滅性利空'}！`, 
                stateChange: isGoodNews ? 'bull' : 'bear', 
                bubbleAdd: isGoodNews ? 10 : -10, 
                isBad: !isGoodNews, 
                sectorEffect: { target: targetSector, mod: isGoodNews ? modValue : -modValue, duration: 3 } 
            };
        } else {
            // 假情報：隔天揭曉被騙，無任何市場效應，玩家可能面臨巨大的做錯方向虧損
            this.state.scheduledNews = { 
                msg: `【假消息】昨天花大錢買的「${sectorName}」情報根本是假的，線人早已捲款潛逃，市場毫無波瀾，你被當韭菜割了！`, 
                stateChange: this.state.marketState, 
                bubbleAdd: 0, 
                isBad: true, 
                sectorEffect: null 
            };
        }
        
        this.updateUI(); 
    },
            promptLiquidation(initialDeficit, reasonText) {
                return new Promise((resolve) => {
                    const totalStockVal = this.state.stocks.reduce((sum, s) => sum + (s.owned * s.price), 0);
                    if (totalStockVal === 0) { resolve(false); return; }
                    const modal = document.getElementById('modal-liquidate'); modal.classList.remove('hidden');
                    const requiredTotalCash = this.state.money + initialDeficit; const feeRate = this.state.diffParams.feeRate;
                    const updateModalUI = () => {
                        const currentDeficit = Math.max(0, requiredTotalCash - this.state.money);
                        document.getElementById('liq-reason').innerText = reasonText; document.getElementById('liq-deficit').innerText = `$ ${this.formatMoney(currentDeficit)}`;
                        const btnConfirm = document.getElementById('btn-liq-confirm');
                        if (currentDeficit <= 0) { btnConfirm.disabled = false; btnConfirm.classList.replace('bg-opacity-30', 'bg-opacity-100'); btnConfirm.classList.add('text-black', 'bg-green-500'); } 
                        else { btnConfirm.disabled = true; btnConfirm.classList.replace('bg-opacity-100', 'bg-opacity-30'); btnConfirm.classList.remove('text-black', 'bg-green-500'); }
                        let html = '';
                        this.state.stocks.forEach((s, idx) => {
                            if (s.owned > 0) {
                                let sharesToCover = 0;
                                if (currentDeficit > 0) {
                                    const liquidity = s.liquidity || 50000; let slipRateEstimate = Math.max(0, (s.owned / liquidity) * 0.05); if (slipRateEstimate > 0.3) slipRateEstimate = 0.3;
                                    let execPriceEstimate = s.price * (1 - slipRateEstimate); sharesToCover = Math.ceil(currentDeficit / (execPriceEstimate * (1 - feeRate))); if (sharesToCover > s.owned) sharesToCover = s.owned;
                                }
                                html += `
                                <div class="flex justify-between items-center border-b border-gray-800 py-2">
                                    <div><div class="font-bold text-white">${s.name}</div><div class="text-xs text-gray-400">持有: ${this.formatMoney(s.owned)} 股 | 市價: $${this.formatMoney(s.price)}</div></div>
                                    <div class="space-x-1 flex flex-col gap-1 items-end w-32">
                                        <button class="btn-retro px-2 py-1 text-[10px] border-cyan text-cyan hover:bg-cyan-900 w-full" onclick="app.liquidateExecute(${idx}, false, ${requiredTotalCash})" ${(currentDeficit <= 0 || s.isLimitDown) ? 'disabled' : ''}>
                                            ${currentDeficit > 0 ? (s.isLimitDown ? '跌停無法變現' : `賣出 ${this.formatMoney(sharesToCover)} 股補缺`) : '已補足'}
                                        </button>
                                        <button class="btn-retro px-2 py-1 text-[10px] border-red-500 text-red-500 hover:bg-red-900 w-full" onclick="app.liquidateExecute(${idx}, true, ${requiredTotalCash})" ${s.isLimitDown ? 'disabled' : ''}>
                                            ${s.isLimitDown ? '跌停鎖死無法平倉' : `全平倉 (${this.formatMoney(s.owned)} 股)`}
                                        </button>
                                    </div>
                                </div>`;
                            }
                        });
                        if (html === '') html = '<div class="text-gray-500 text-center py-4">已無現股可供變現</div>';
                        document.getElementById('liq-stock-list').innerHTML = html;
                    };
                    this.state.currentLiquidationUpdate = updateModalUI;
                    const btnConfirm = document.getElementById('btn-liq-confirm'); const btnFail = document.getElementById('btn-liq-fail');
                    btnConfirm.onclick = () => { modal.classList.add('hidden'); this.state.currentLiquidationUpdate = null; resolve(true); };
                    btnFail.onclick = () => { modal.classList.add('hidden'); this.state.currentLiquidationUpdate = null; resolve(false); };
                    updateModalUI();
                });
            },
            liquidateExecute(idx, sellAll, requiredTotalCash) {
                const s = this.state.stocks[idx]; const feeRate = this.state.diffParams.feeRate; const liquidity = s.liquidity || 50000;
                let sharesToSell = s.owned;
                if (!sellAll) {
                    const currentDeficit = Math.max(0, requiredTotalCash - this.state.money); if (currentDeficit <= 0) return;
                    let slipRateEstimate = Math.max(0, (s.owned / liquidity) * 0.05); if (slipRateEstimate > 0.3) slipRateEstimate = 0.3;
                    let execPriceEstimate = s.price * (1 - slipRateEstimate); sharesToSell = Math.ceil(currentDeficit / (execPriceEstimate * (1 - feeRate))); if (sharesToSell > s.owned) sharesToSell = s.owned;
                }
                if (sharesToSell <= 0) return;
                let slipRate = Math.max(0, (sharesToSell / liquidity) * 0.05); if (slipRate > 0.3) slipRate = 0.3;
                let execPrice = s.price * (1 - slipRate); let actualEarn = sharesToSell * execPrice * (1 - feeRate);
                this.state.money += actualEarn; const profit = actualEarn - (sharesToSell * s.avgCost);
                if (profit > 0) this.state.yearRevenue += profit; else this.state.yearDeductions += Math.abs(profit);
                s.owned -= sharesToSell; if (s.owned === 0) s.avgCost = 0; s.price = Math.max(10, Math.floor(s.price * (1 - slipRate * 0.1)));
                this.log(`【變現】拋售 ${s.name} 共 ${this.formatMoney(sharesToSell)} 股，得款 $${this.formatMoney(actualEarn)}。`, "text-cyan");
                this.updateUI(); this.renderMarket(); if (this.state.currentLiquidationUpdate) this.state.currentLiquidationUpdate();
            },
            addModalAmt(inputId, amount) {
                const input = document.getElementById(inputId); if (!input) return; let current = parseInt(input.value) || 0; let next = current + amount; if (next < 0) next = 0; input.value = next; if (inputId === 'la-amount') this.updateLoanApplyUI();
            },
            setModalMaxAmt(type) {
                if (type === 'la') { const input = document.getElementById('la-amount'); if (this.state.loanApplyContext) { input.value = this.state.loanApplyContext.maxAmount; this.updateLoanApplyUI(); } }
                else if (type === 'fd') { document.getElementById('fd-amount').value = Math.floor(this.state.money); }
            },
            openLoanModal(bankId, productId) {
                const bank = DB.banks.find(b => b.id === bankId); const prod = bank.products.find(p => p.id === productId); this.state.loanApplyContext = { bank, prod, selectedCollateral: null, maxAmount: 0 };
                document.getElementById('la-bank-name').innerText = bank.name; document.getElementById('la-prod-name').innerText = prod.name; document.getElementById('la-rate').innerText = `${(prod.currentRate * 100).toFixed(1)}%`; document.getElementById('la-term').innerText = prod.term; document.getElementById('la-desc').innerText = prod.desc;
                const colSection = document.getElementById('la-collateral-section'); const colSelect = document.getElementById('la-collateral-select');
                if (prod.type === 'secured') {
                    colSection.classList.remove('hidden'); let options = `<option value="">-- 請選擇未抵押之資產 --</option>`; let hasEligible = false;
                    if (prod.targetType === 're') {
                        this.state.portfolioRE.forEach(item => { if (!item.isMortgaged) { const def = DB.realEstate.find(r => r.id === item.id); options += `<option value="${item.instanceId}">${def.name} (市值約 $${this.formatMoney(def.price)})</option>`; hasEligible = true; } });
                    } else if (prod.targetType === 'luxury') {
                        this.state.portfolioLuxury.forEach(item => { if (!item.isMortgaged) { const def = DB.luxury.find(l => l.id === item.id); options += `<option value="${item.instanceId}">${def.name} (殘值約 $${this.formatMoney(def.price * 0.5)})</option>`; hasEligible = true; } });
                    }
                    colSelect.innerHTML = options; if(!hasEligible) colSelect.innerHTML = `<option value="">無符合條件的資產可供抵押</option>`; this.state.loanApplyContext.maxAmount = 0;
                } else if (prod.type === 'unsecured') {
                    colSection.classList.add('hidden'); const nw = this.getNetWorth().total; const existingUnsecured = this.state.activeLoans.filter(l => l.type === 'unsecured').reduce((sum, l) => sum + l.principal, 0);
                    this.state.loanApplyContext.maxAmount = Math.max(0, Math.floor(nw * prod.maxNetWorthPct) - existingUnsecured);
                } else if (prod.type === 'yakuza') {
                    colSection.classList.add('hidden'); const existingYakuza = this.state.activeLoans.filter(l => l.productId === prod.id).reduce((sum, l) => sum + l.principal, 0);
                    this.state.loanApplyContext.maxAmount = Math.max(0, prod.maxFixed - existingYakuza);
                }
                document.getElementById('la-amount').value = ''; this.updateLoanApplyUI(); document.getElementById('modal-loan-apply').classList.remove('hidden');
            },
            updateLoanApplyUI() {
                const ctx = this.state.loanApplyContext; const amtInput = document.getElementById('la-amount'); const btn = document.getElementById('btn-loan-confirm'); const warn = document.getElementById('la-warn');
                if (ctx.prod.type === 'secured') {
                    const selId = document.getElementById('la-collateral-select').value;
                    if (selId) {
                        ctx.selectedCollateral = selId; let assetVal = 0;
                        if (ctx.prod.targetType === 're') { const pItem = this.state.portfolioRE.find(i => i.instanceId === selId); assetVal = DB.realEstate.find(r => r.id === pItem.id).price; }
                        else { const pItem = this.state.portfolioLuxury.find(i => i.instanceId === selId); assetVal = DB.luxury.find(l => l.id === pItem.id).price * 0.5; }
                        ctx.maxAmount = Math.floor(assetVal * ctx.prod.maxLTV);
                    } else { ctx.selectedCollateral = null; ctx.maxAmount = 0; }
                }
                document.getElementById('la-max-amt').innerText = `$${this.formatMoney(ctx.maxAmount)}`;
                const reqAmt = parseInt(amtInput.value) || 0;
                if (reqAmt > 0 && reqAmt <= ctx.maxAmount && (ctx.prod.type !== 'secured' || ctx.selectedCollateral)) { btn.disabled = false; warn.classList.add('hidden'); } else { btn.disabled = true; if (reqAmt > ctx.maxAmount) warn.classList.remove('hidden'); else warn.classList.add('hidden'); }
            },
            validateLoanApplyAmount() { this.updateLoanApplyUI(); },
            executeLoanApply() {
                const ctx = this.state.loanApplyContext; const amt = parseInt(document.getElementById('la-amount').value); if (!amt || amt <= 0 || amt > ctx.maxAmount) return;
                let colName = '無擔保信用';
                if (ctx.prod.type === 'secured') {
                    if (ctx.prod.targetType === 're') { const item = this.state.portfolioRE.find(i => i.instanceId === ctx.selectedCollateral); item.isMortgaged = true; colName = DB.realEstate.find(r => r.id === item.id).name; }
                    else { const item = this.state.portfolioLuxury.find(i => i.instanceId === ctx.selectedCollateral); item.isMortgaged = true; colName = DB.luxury.find(l => l.id === item.id).name; }
                } else if (ctx.prod.type === 'yakuza') { colName = '極道融資 (命)'; }
                const dueDate = new Date(this.state.date); dueDate.setDate(dueDate.getDate() + ctx.prod.term);
                const newLoan = { id: 'L_' + Date.now(), bankId: ctx.bank.id, productId: ctx.prod.id, type: ctx.prod.type, name: ctx.prod.name, principal: amt, currentRate: ctx.prod.currentRate, startDate: new Date(this.state.date), dueDate: dueDate, collateralType: ctx.prod.targetType || null, collateralId: ctx.selectedCollateral, collateralName: colName };
                this.state.activeLoans.push(newLoan); this.state.money += amt; this.log(`【借貸契約成立】向 ${ctx.bank.name} 借款 $${this.formatMoney(amt)}，到期日 ${this.formatDateStr(dueDate).substring(5)}。`, 'text-red-retro font-bold');
                this.closeModal('loan-apply'); this.updateUI(); this.renderBankAndAssets(); this.renderShopAndAssets();
            },
            repayLoanEarly(loanId) {
                const idx = this.state.activeLoans.findIndex(l => l.id === loanId); if(idx === -1) return; const loan = this.state.activeLoans[idx];
                
                // 1. 計算經過天數與應付利息
                const todayTime = this.state.date.getTime();
                const startTime = loan.startDate.getTime();
                const daysPassed = Math.max(1, Math.ceil((todayTime - startTime) / (1000 * 3600 * 24))); // 避免當天借還，至少算1天
                
                // 【關鍵修正】地下錢莊(yakuza)是「月息(除以30)」，正規銀行是「年息(除以365)」
                const divisor = loan.type === 'yakuza' ? 30 : 365;
                const accruedInterest = Math.floor(loan.principal * (loan.currentRate / divisor) * daysPassed);
                const totalRepayment = loan.principal + accruedInterest;

                if(this.state.money < totalRepayment) { 
                    this.log(`現金不足！(包含利息共需 $${this.formatMoney(totalRepayment)})`, "text-red-500"); 
                    return; 
                }
                
                // 2. 扣款並將利息認列為年度支出 (可抵稅)
                this.state.money -= totalRepayment;
                this.state.yearDeductions += accruedInterest; 

                if(loan.type === 'secured') {
                    if(loan.collateralType === 're') { const item = this.state.portfolioRE.find(i => i.instanceId === loan.collateralId); if(item) item.isMortgaged = false; }
                    else { const item = this.state.portfolioLuxury.find(i => i.instanceId === loan.collateralId); if(item) item.isMortgaged = false; }
                }
                this.state.activeLoans.splice(idx, 1); 
                
                this.log(`【還款成功】提早結清 ${loan.name}，支付本金 $${this.formatMoney(loan.principal)} 及利息 $${this.formatMoney(accruedInterest)}，解鎖擔保品。`, 'text-cyan');
                this.updateUI(); this.renderBankAndAssets(); this.renderShopAndAssets();
            },
            
            async processActiveLoansDaily() {
                const todayTime = this.state.date.getTime();
                for (let i = this.state.activeLoans.length - 1; i >= 0; i--) {
                    const loan = this.state.activeLoans[i];
                    
                    if (todayTime >= loan.dueDate.getTime()) {
                        const totalDays = Math.max(1, Math.ceil((loan.dueDate.getTime() - loan.startDate.getTime()) / (1000 * 3600 * 24)));
                        
                        // 【關鍵修正】地下錢莊(yakuza)是「月息(除以30)」，正規銀行是「年息(除以365)」
                        const divisor = loan.type === 'yakuza' ? 30 : 365;
                        const accruedInterest = Math.floor(loan.principal * (loan.currentRate / divisor) * totalDays);
                        const totalRepayment = loan.principal + accruedInterest;

                        this.log(`【貸款到期】合約 ${loan.name} 今日到期，準備扣款本利和 $${this.formatMoney(totalRepayment)}...`, 'text-yellow');
                        
                        if (this.state.money < totalRepayment) {
                            let deficit = totalRepayment - this.state.money; 
                            const success = await this.promptLiquidation(deficit, `合約 ${loan.name} 扣款失敗，需緊急籌措現金！`);
                            if(!success) { this.log(`【變現失敗】您放棄掙扎或已無能為力。`, 'text-red-500'); }
                        }
                        
                        if (this.state.money >= totalRepayment) {
                            this.state.money -= totalRepayment;
                            this.state.yearDeductions += accruedInterest; // 將利息列入抵稅
                            if(loan.type === 'secured') {
                                if(loan.collateralType === 're') { const item = this.state.portfolioRE.find(x => x.instanceId === loan.collateralId); if(item) item.isMortgaged = false; }
                                else { const item = this.state.portfolioLuxury.find(x => x.instanceId === loan.collateralId); if(item) item.isMortgaged = false; }
                            }
                            this.state.activeLoans.splice(i, 1); 
                            this.log(`👉 扣款成功！債務已結清 (含利息 $${this.formatMoney(accruedInterest)})。`, 'text-green-400');
                        } else { 
                            this.handleLoanDefault(loan, i); 
                        }
                    }
                }
            },

            handleLoanDefault(loan, index) {
                this.log(`❌ 餘額不足！引發貸款違約 (Default)！`, 'text-red-500 font-bold text-lg animate-pulse');
                if (loan.type === 'secured') {
                    if (loan.collateralType === 're') { const rIdx = this.state.portfolioRE.findIndex(x => x.instanceId === loan.collateralId); if (rIdx > -1) this.state.portfolioRE.splice(rIdx, 1); }
                    else { const lIdx = this.state.portfolioLuxury.findIndex(x => x.instanceId === loan.collateralId); if (lIdx > -1) this.state.portfolioLuxury.splice(lIdx, 1); }
                    this.state.activeLoans.splice(index, 1);
                    if (loan.bankId === 'B3') { this.state.stress += 50; this.state.health -= 20; this.log(`【極道暴力討債】地下錢莊強行侵吞了您的 ${loan.collateralName} 抵債！並受到物理教訓！`, 'text-magenta font-bold'); }
                    else { this.state.stress += 30; this.log(`【法拍強制執行】銀行強制查封並法拍了您的 ${loan.collateralName} 用於抵債。契約終止。`, 'text-red-500'); }
                } else if (loan.type === 'unsecured') {
                    this.state.money = 0; Object.values(this.state.accounts).forEach(a => a.deposit = 0); this.state.stress += 50; this.state.activeLoans.splice(index, 1); this.log(`【信用破產】銀行凍結並扣押了您所有的現金與存款！`, 'text-red-500');
                } else if (loan.type === 'yakuza') {
                    this.state.money = 0; this.state.health -= 50; this.state.stress = 100; this.log(`【極道制裁】地下錢莊的人找上門了。你被打斷了腿，現金被清空。債務延期 10 天！`, 'text-magenta font-bold');
                    loan.dueDate.setDate(loan.dueDate.getDate() + 10); loan.principal *= 1.2; 
                }
            },
            addBankAmt(bankId, amount) { const input = document.getElementById(`b-amt-${bankId}`); if (!input) return; let current = parseInt(input.value) || 0; let next = current + amount; if (next < 0) next = 0; input.value = next; },
            setBankMaxAmt(bankId) {
    const acc = this.state.accounts[bankId]; 
    const input = document.getElementById(`b-amt-${bankId}`); 
    if (!input || !acc) return;
    
    // 加上 Math.floor(this.state.money) 確保取出現金或存款時都是整數
    if (this.state.money > 0) {
        input.value = Math.floor(this.state.money);
    } else if (acc.deposit > 0) {
        input.value = Math.floor(acc.deposit);
    } else {
        input.value = 0;
    }
},
            bankOp(bankId, op) {
                const acc = this.state.accounts[bankId]; let amt = parseInt(document.getElementById(`b-amt-${bankId}`).value) || 0; if (amt <= 0) return; 
                if (op === 'dep') { if(amt > this.state.money) { this.log("現金不足以存款！", "text-red-500"); return; } this.state.money -= amt; acc.deposit += amt; }
                else if (op === 'wit') { if(amt > acc.deposit) { this.log("存款餘額不足！", "text-red-500"); return; } this.state.money += amt; acc.deposit -= amt; }
                document.getElementById(`b-amt-${bankId}`).value = ''; this.updateUI(); this.renderBankAndAssets();
            },
            processDailyBankInterest() {
                DB.banks.forEach(b => { const acc = this.state.accounts[b.id]; if(acc.deposit > 0) { let interest = acc.deposit * (b.depositRate / 365); acc.deposit += interest; this.state.yearRevenue += interest; } });
            },
            openFixedDeposit(bankId) {
                const b = DB.banks.find(x => x.id === bankId); this.state.currentBankForFD = b;
                document.getElementById('fd-bank-name').innerText = b.name; document.getElementById('fd-rate').innerText = `${(b.fdRate*100).toFixed(1)}%`; document.getElementById('fd-days').innerText = b.fdDays; document.getElementById('modal-fixed-dep').classList.remove('hidden');
            },
            confirmFixedDeposit() {
                const amt = parseInt(document.getElementById('fd-amount').value); const b = this.state.currentBankForFD;
                if (!amt || amt <= 0 || amt > this.state.money) { this.log("定存金額無效或現金不足！", "text-red-500"); return; }
                this.state.money -= amt; const matureDate = new Date(this.state.date); matureDate.setDate(matureDate.getDate() + b.fdDays); const totalReturn = Math.floor(amt * (1 + b.fdRate * (b.fdDays/365)));
                this.addCalendarEvent(matureDate, 'fd_mature', `${b.name} 定存到期`, totalReturn, { principal: amt });
                this.log(`【銀行】辦理定存 $${this.formatMoney(amt)}，將於 ${b.fdDays} 天後到期。`, 'text-cyan'); this.closeModal('fixed-dep'); this.updateUI(); this.renderBankAndAssets();
            },
            async advanceDay() {
                if(this.state.isGameOver || this.state.isProcessingDay) return; this.state.isProcessingDay = true;
                if (this.state.hospitalizedDays > 0) {
        this.state.hospitalizedDays--;
        
        // 住院期間有專業醫療照護：健康與幸福大幅恢復，且維持滿飽食度避免飢餓扣血
        this.state.health += 15;
        this.state.happiness += 10;
        this.state.satiety = 100; 
        
        if (this.state.hospitalizedDays === 0) {
            this.log(`【🏥 出院】經過 7 天的休養，您終於康復出院了！重新投入商戰吧。`, "text-green-400 font-bold");
        } else {
            this.log(`【🏥 剩餘住院天數：${this.state.hospitalizedDays} 天】接受專業醫療照護中... (健康+15, 幸福+10)`, "text-gray-400");
        }
    }
                const diff = this.state.diffParams; const meal = MEALS[this.state.currentMeal]; const dailyTotalCost = this.state.currentBaseDailyCost + Math.floor(meal.cost * this.state.priceMultiplier);

                if (this.state.money >= dailyTotalCost) { this.state.money -= dailyTotalCost; this.state.satiety += meal.satiety; this.state.health += meal.health; this.state.happiness += meal.happiness; this.state.stress += meal.stress; }
                else { this.log("【警告】現金透支！無法支付生活費，只能餓肚子！", "text-red-500 font-bold"); this.state.satiety -= 20; this.state.health -= 5; this.state.happiness -= 10; this.state.stress += 10; }

                this.state.date.setDate(this.state.date.getDate() + 1); 
// [關鍵新增] 檢查推進後是否跨入新的一年 (1月1日)，執行年度板塊景氣大洗牌
                if (this.state.date.getMonth() === 0 && this.state.date.getDate() === 1) {
                    if (typeof CEO_MODULE !== 'undefined' && typeof CEO_MODULE.rollBusinessCycle === 'function') {
                        CEO_MODULE.rollBusinessCycle(this.state.date.getFullYear());
                    }
                }
                
                // [關鍵新增] 更新全域航運與燃油指數
                if (!this.state.SCFI) this.state.SCFI = 1500;
                let scfiDrift = (Math.random() - 0.5) * 20;
                
                // 景氣連結：牛市/熊市與運費指數
                if (this.state.marketState === 'bull') {
                    scfiDrift += (Math.random() * 10 + 5);
                } else if (this.state.marketState === 'bear') {
                    scfiDrift -= (Math.random() * 10 + 5);
                }

                if (typeof CEO_MODULE !== 'undefined' && CEO_MODULE.currentBusinessCycle) {
                    if (CEO_MODULE.currentBusinessCycle.main === 'transport') {
                        scfiDrift += (Math.random() * 15);
                    }
                }
                if (Math.random() < 0.01) {
                    let shock = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 500 + 200);
                    scfiDrift += shock;
                    if (shock > 300) this.log(`【全球快訊】紅海危機/罷工加劇！全球貨櫃運價指數(SCFI)暴漲。`, 'text-red-500 font-bold animate-pulse');
                    else if (shock < -300) this.log(`【全球快訊】運力過剩危機！全球貨櫃運價指數(SCFI)暴跌。`, 'text-green-500 font-bold animate-pulse');
                }
                this.state.SCFI = Math.max(300, Math.min(10000, this.state.SCFI + scfiDrift));

                // ==========================================
                // [新增] 半導體週期指數 (SCI) 每日微幅波動與漂移
                // ==========================================
                if (!this.state.SCI) this.state.SCI = 100;
                let sciDrift = (Math.random() - 0.5) * 1.5; // 日常微幅震盪 +/- 0.75%
                
                // 根據當前景氣大循環施加趨勢漂移
                if (typeof CEO_MODULE !== 'undefined' && CEO_MODULE.currentBusinessCycle) {
                    if (CEO_MODULE.currentBusinessCycle.main === 'semi') {
                        sciDrift += (Math.random() * 0.8 + 0.2); // 大牛市向上漂移
                    } else if (CEO_MODULE.currentBusinessCycle.related.includes('semi')) {
                        sciDrift += (Math.random() * 0.4 + 0.1); // 溫和牛市小幅向上
                    } else if (CEO_MODULE.currentBusinessCycle.main !== 'semi') {
                        sciDrift -= (Math.random() * 0.5 + 0.1); // 衰退期向下漂移
                    }
                }
                this.state.SCI = Math.max(30, Math.min(250, this.state.SCI + sciDrift));

                // ==========================================
                // [新增] 生技景氣指數 (BCI) 每日微幅波動與漂移
                // ==========================================
                if (!this.state.BCI) this.state.BCI = 100;
                let bciDrift = (Math.random() - 0.5) * 1.6; // 日常微幅震盪 +/- 0.8%
                
                // 根據當前景氣大循環施加趨勢漂移
                if (typeof CEO_MODULE !== 'undefined' && CEO_MODULE.currentBusinessCycle) {
                    if (CEO_MODULE.currentBusinessCycle.main === 'pharma') {
                        bciDrift += (Math.random() * 0.8 + 0.2); // 生技大牛市向上漂移
                    } else if (CEO_MODULE.currentBusinessCycle.related && CEO_MODULE.currentBusinessCycle.related.includes('pharma')) {
                        bciDrift += (Math.random() * 0.4 + 0.1); // 溫和向上
                    } else if (CEO_MODULE.currentBusinessCycle.main !== 'pharma') {
                        bciDrift -= (Math.random() * 0.5 + 0.1); // 衰退期向下漂移
                    }
                }
                this.state.BCI = Math.max(30, Math.min(250, this.state.BCI + bciDrift));

                // ==========================================
                // [新增] 電子消費景氣指數 (ECI) 每日微幅波動與漂移
                // ==========================================
                if (!this.state.ECI) this.state.ECI = 100;
                let eciDrift = (Math.random() - 0.5) * 1.8; // 日常微幅震盪 +/- 0.9%
                // 根據當前景氣大循環施加趨勢漂移
                if (typeof CEO_MODULE !== 'undefined' && CEO_MODULE.currentBusinessCycle) {
                    if (CEO_MODULE.currentBusinessCycle.main === 'electronics') {
                        eciDrift += (Math.random() * 0.9 + 0.2); // 電子大牛市向上漂移
                    } else if (CEO_MODULE.currentBusinessCycle.related && CEO_MODULE.currentBusinessCycle.related.includes('electronics')) {
                        eciDrift += (Math.random() * 0.4 + 0.1); // 溫和向上
                    } else if (CEO_MODULE.currentBusinessCycle.main !== 'electronics') {
                        eciDrift -= (Math.random() * 0.5 + 0.1); // 衰退期向下漂移
                    }
                }
                // SCI 對 ECI 的連動效應（半導體熱，電子也跟著漲）
                if (this.state.SCI > 120) eciDrift += 0.3;
                else if (this.state.SCI < 70) eciDrift -= 0.3;
                this.state.ECI = Math.max(30, Math.min(250, this.state.ECI + eciDrift));

                // ==========================================
                // [新增] 遊戲與文創景氣指數 (GCI) 每日微幅波動與漂移
                // ==========================================
                if (!this.state.GCI) this.state.GCI = 100;
                let gciDrift = (Math.random() - 0.5) * 1.8; // 日常微幅震盪 +/- 0.9%
                // 根據當前景氣大循環施加趨勢漂移
                if (typeof CEO_MODULE !== 'undefined' && CEO_MODULE.currentBusinessCycle) {
                    if (CEO_MODULE.currentBusinessCycle.main === 'game') {
                        gciDrift += (Math.random() * 0.9 + 0.2); // 遊戲大牛市向上漂移
                    } else if (CEO_MODULE.currentBusinessCycle.related && CEO_MODULE.currentBusinessCycle.related.includes('game')) {
                        gciDrift += (Math.random() * 0.4 + 0.1); // 溫和向上
                    } else if (CEO_MODULE.currentBusinessCycle.main !== 'game') {
                        gciDrift -= (Math.random() * 0.5 + 0.1); // 衰退期向下漂移
                    }
                }
                // ECI 對 GCI 的連動效應（電子熱，遊戲也熱）
                if (this.state.ECI > 120) gciDrift += 0.3;
                else if (this.state.ECI < 70) gciDrift -= 0.3;
                this.state.GCI = Math.max(30, Math.min(250, this.state.GCI + gciDrift));

                if (!this.state.jetFuelPrice) this.state.jetFuelPrice = 85;
                let energySector = DB.sectors['energy'];
                let energyTrend = energySector ? energySector.trendRate : 0;
                let jetDrift = (Math.random() - 0.5) * 1.5 + (energyTrend * 100);
                this.state.jetFuelPrice = Math.max(30, Math.min(250, this.state.jetFuelPrice + jetDrift));

                // [新增] 陸運與基礎物流的景氣熱度 (Logistics Demand)
                if (!this.state.logisticsDemand) this.state.logisticsDemand = 100;
                let retailSector = DB.sectors['retail'];
                let retailTrend = retailSector ? retailSector.trendRate : 0;
                let logisticsDrift = (Math.random() - 0.5) * 5 + (retailTrend * 1000);
                this.state.logisticsDemand = Math.max(50, Math.min(200, this.state.logisticsDemand + logisticsDrift));

                    for (let i = this.state.calendarEvents.length - 1; i >= 0; i--) {
                    const ev = this.state.calendarEvents[i];
                    
                    // 安全相容：動態將字串或 Date 物件統一轉為有效的 Date 實例
                    const evDateObj = typeof ev.date === 'string' ? new Date(ev.date) : ev.date;

                    // 確保 evDateObj 有效再進行精確比對
                    if (evDateObj && !isNaN(evDateObj.getTime()) &&
                        evDateObj.getFullYear() === this.state.date.getFullYear() &&
                        evDateObj.getMonth() === this.state.date.getMonth() &&
                        evDateObj.getDate() === this.state.date.getDate()) {
                        
                        if (ev.type === 'bug_crisis') {
                            const targetCorp = this.state.stocks.find(s => s.id === ev.corpId);
                            if (targetCorp) {
                                // 1. 股價與熱度重挫
                                targetCorp.spillover -= 0.3; 
                                
                                // 2. 將該 Bug 產品的現金流轉為巨額負值 (模擬退款與通路賠償)
                                if (targetCorp.launchedProducts) {
                                    const buggyProd = targetCorp.launchedProducts.find(p => p.name === ev.productName);
                                    if (buggyProd) {
                                        buggyProd.dailyBase = -Math.abs(buggyProd.dailyBase * 1.5);
                                        buggyProd.quality = 5; // 評分徹底崩盤
                                    }
                                }

                                // 3. 認列賠償金支出 (自公司帳戶扣除 25% 現金)
                                const refundCost = Math.floor((targetCorp.corporateCash || 10000000) * 0.25);
                                targetCorp.corporateCash = Math.max(0, targetCorp.corporateCash - refundCost);
                                targetCorp.monthExpense = (targetCorp.monthExpense || 0) + refundCost;

                                // 4. 發布緊急日誌與公司內部公告
                                this.log(`【🚨 災難性退貨潮】${targetCorp.name} 先前強推帶有重大瑕疵的「${ev.productName}」引發集體訴訟與退款潮！公司慘賠 $${this.formatMoney(refundCost)} 且商譽重挫！`, 'text-red-500 font-bold animate-pulse');
                                
                                if (!targetCorp.companyNews) targetCorp.companyNews = [];
                                targetCorp.companyNews.push({
                                    date: this.formatDateStr(this.state.date).substring(5),
                                    msg: `【公關危機】「${ev.productName}」爆發嚴重系統缺陷，遭到全球經銷商全面下架抵制。`,
                                    isGood: false
                                });
                                
                                // 若玩家正好在看這間公司，即時刷新畫面上方的現金顯示
                                if (typeof CEO_MODULE !== 'undefined' && CEO_MODULE.currentCompanyIdx === this.state.stocks.indexOf(targetCorp)) {
                                    const cashEl = document.getElementById('ceo-company-cash');
                                    if (cashEl) cashEl.innerText = `$ ${this.formatMoney(targetCorp.corporateCash)}`;
                                }
                            }
                            // 【關鍵修正】把 splice 移到這個括號裡面，確保只刪除 bug_crisis 事件
                            this.state.calendarEvents.splice(i, 1);
                        }
                    }
                }
                
                // 正確呼叫 CEO 模組，更新所有公司的研發進度
                if (typeof CEO_MODULE !== 'undefined' && typeof CEO_MODULE.updateProjects === 'function') {
                    CEO_MODULE.updateProjects();
                }

                const todayStr = this.formatDateStr(this.state.date); const isWeekend = this.state.date.getDay() === 0 || this.state.date.getDay() === 6; const isFirstOfMonth = this.state.date.getDate() === 1;

                if ((this.state.date.getMonth() === 5 && this.state.date.getDate() === 30) || (this.state.date.getMonth() === 11 && this.state.date.getDate() === 31)) this.adjustPricesByInflation();

                this.state.satiety -= 30; if (this.state.satiety <= 0) { this.state.health -= 10; this.state.stress += 10; this.log("極度飢餓！健康值大幅下降！", "text-red-500"); }
                
                if (this.state.date.getDay() === 0) {
                    if (this.state.residence.type === 'none') {
                        this.state.health -= 5; this.state.happiness -= 15; this.state.stress += 20; this.log(`【露宿街頭】本週無家可歸，身心受到嚴重打擊！健康-5, 幸福-15, 壓力+20。`, 'text-red-500 font-bold');
                    } else {
                        const def = DB.realEstate.find(r => r.id === this.state.residence.id);
                        if (def) { const w = def.weekly; this.state.health += w.hp; this.state.happiness += w.hap; this.state.stress += w.str; let hpStr = w.hp >= 0 ? `+${w.hp}` : w.hp; let hapStr = w.hap >= 0 ? `+${w.hap}` : w.hap; let strStr = w.str > 0 ? `+${w.str}` : (w.str === 0 ? '0' : w.str); this.log(`【居住結算】本週居住於 ${def.name}：健康 ${hpStr}, 幸福 ${hapStr}, 壓力 ${strStr}。`, 'text-gray-500'); }
                    }
                }

                if (this.state.residence.type !== 'own') {
                    const def = DB.realEstate.find(r => r.id === this.state.residence.id);
                    if (def && Math.random() < def.hazardProb) {
                        const r = Math.random(); let cost = 0; let stressAdd = 0; let hapDrop = 0; let msg = '';
                        if (r < 0.4) { cost = Math.floor(20000 * this.state.priceMultiplier); stressAdd = 15; hapDrop = 5; msg = `【房屋狀況】${def.name}發生嚴重漏水！清理善後並修復管線花費 $${this.formatMoney(cost)}。`; }
                        else if (r < 0.7) { cost = Math.floor(35000 * this.state.priceMultiplier); stressAdd = 20; hapDrop = 10; msg = `【房屋狀況】${def.name}熱水器突然故障！在寒冬洗冷水澡氣炸了，叫修花費 $${this.formatMoney(cost)}。`; }
                        else { cost = Math.floor(10000 * this.state.priceMultiplier); stressAdd = 10; hapDrop = 2; msg = `【房屋狀況】${def.name}牆壁大面積壁癌剝落，影響空氣品質，處理費用 $${this.formatMoney(cost)}。`; }
                        if (this.state.money >= cost) { this.state.money -= cost; } else { this.state.money = 0; stressAdd += 10; msg += " (現金不足，只能勉強應急，生活品質大受打擊！)"; }
                        this.state.stress += stressAdd; this.state.happiness -= hapDrop; this.log(msg, "text-magenta font-bold");
                    }
                }
                
                if (Math.random() < 0.03) {
                    const r = Math.random();
                    if (r < 0.3) { 
    this.state.health -= 20; 
    this.state.money = Math.max(0, this.state.money - 5000); this.log("【突發】感冒看醫生，花費 $5,000。", "text-red-400"); } 
                    else if (r < 0.5) { this.state.money += 20000; this.log("【突發】路上撿到 $20,000。", "text-yellow"); } 
                    else if (r < 0.8) { 
    this.state.money = Math.max(0, this.state.money - 15000); this.state.stress += 10; this.log("【突發】出門不慎遺失錢包/物品，損失 $15,000。", "text-magenta"); } 
                    else { const loss = Math.min(this.state.money, 50000); this.state.money -= loss; this.state.stress += 25; this.log(`【突發】遭遇扒手！損失 $${this.formatMoney(loss)}。`, "text-red-500 font-bold"); }
                }

                if (this.state.portfolioLuxury.length > 0 && Math.random() < 0.03 && !this.state.scheduledNews) {
                    let maxLuxPrice = 0; let bestLuxItem = null;
                    
                    // 找出玩家名下最貴的資產
                    this.state.portfolioLuxury.forEach(item => { 
                        const def = DB.luxury.find(l => l.id === item.id); 
                        if (def && def.price > maxLuxPrice) { maxLuxPrice = def.price; bestLuxItem = def; } 
                    });
                    
                    if (bestLuxItem) {
                        let tierName, modValue, persons, scenarios;
                        
                        // 根據資產價值決定遇到的人物層級與情報強度
                        if (maxLuxPrice >= 200000000) { 
                            tierName = "國家級內線"; modValue = 0.5; 
                            persons = ["跨國集團總裁", "主權基金管理人", "神秘的政商造王者", "執政黨高層"];
                        } else if (maxLuxPrice >= 50000000) { 
                            tierName = "絕對內線"; modValue = 0.4; 
                            persons = ["政商大老", "財閥家族核心", "內閣高階官員", "知名外資大戶"]; 
                        } else if (maxLuxPrice >= 10000000) { 
                            tierName = "高層密報"; modValue = 0.2; 
                            persons = ["上市企業高層", "外資首席操盤手", "金控副總經理", "大型建商老闆"]; 
                        } else { 
                            tierName = "馬路消息"; modValue = 0.1; 
                            persons = ["投信經理人", "知名分析師", "地方民意代表", "俱樂部 VIP 會員"]; 
                        }
                        
                        // 根據資產種類決定社交場景
                        if (bestLuxItem.category === 'vehicle') {
                            scenarios = ["在私人機棚的VIP休息室", "於豪華遊艇的香檳派對上", "在封閉的頂級賽道俱樂部", "於私人司機接送的空檔", "在高級車友會的晨跑聚會"];
                        } else {
                            scenarios = ["在蘇富比VIP專屬預展中", "於隱密的高爾夫球局", "在私人酒莊的品酒會上", "於頂級藝術品鑑賞沙龍", "在隱私度極高的馬術俱樂部"];
                        }
                        
                        // 隨機抽取出獨一無二的劇情組合
                        const person = persons[Math.floor(Math.random() * persons.length)];
                        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
                        
                        // 產生市場效應
                        const availableSectors = [...new Set(this.state.stocks.map(s => s.sector))]; 
                        const targetSector = availableSectors[Math.floor(Math.random() * availableSectors.length)]; 
                        const sectorName = DB.sectors[targetSector].name; 
                        const isGoodNews = Math.random() > 0.5;
                        
                        this.state.scheduledNews = { 
                            msg: `【獨家內幕】（${tierName}成真）${sectorName}迎來${isGoodNews ? '重大利多' : '毀滅性利空'}！`, 
                            stateChange: isGoodNews ? 'bull' : 'bear', 
                            bubbleAdd: isGoodNews ? 10 : -10, 
                            isBad: !isGoodNews, 
                            sectorEffect: { target: targetSector, mod: isGoodNews ? modValue : -modValue, duration: 3 } 
                        };
                        
                        // 輸出帶有故事性的日誌
                        this.log(`【上流社交】您展現的「${bestLuxItem.name}」彰顯了您的非凡實力。${scenario}，您成功引起了${person}的注意。對方在酒酣耳熱之際向你暗示：「聽好，明天【${sectorName}】板塊將有${isGoodNews ? '重大利多' : '毀滅性利空'}，趕快去佈局吧！」`, "text-cyan font-bold");
                    }
                }

                let dailyStress = 3;
                if(this.state.stocks.some(s => s.owned > 0 || s.shortOwned > 0)) dailyStress += 2; 
                if(this.state.activeLoans.length > 0) dailyStress += 5; 
                if (this.state.health < 30) dailyStress += 5; if (this.state.happiness < 30) dailyStress += 5; if (this.state.happiness > 70) dailyStress -= 5;
                dailyStress *= diff.stressMult; this.state.stress += Math.max(0, dailyStress - this.state.comfort);
                this.state.satiety = Math.max(0, Math.min(100, this.state.satiety)); this.state.health = Math.max(0, Math.min(100, this.state.health)); this.state.happiness = Math.max(0, Math.min(100, this.state.happiness)); this.state.stress = Math.max(0, Math.min(100, this.state.stress));

                let totalBorrowFee = 0; this.state.stocks.forEach(s => { if (s.shortOwned > 0) totalBorrowFee += (s.shortOwned * s.price * 0.0005); });
                if (totalBorrowFee > 0) { 
    if (this.state.money >= totalBorrowFee) {
        this.state.money -= totalBorrowFee;
    } else {
        this.state.money = 0;
        this.state.stress += 5; // 沒錢付利息導致壓力上升
    }
    this.state.yearDeductions += totalBorrowFee; 
}

                this.processCalendarEvents(todayStr); this.processDailyBankInterest(); await this.processActiveLoansDaily(); 
                
                if (isFirstOfMonth) this.processMonthlySettlement();
                
                if (this.state.date.getMonth() === 4 && this.state.date.getDate() === 1) {
                    let totalPropertyTax = 0; this.state.portfolioRE.forEach(item => { const def = DB.realEstate.find(r => r.id === item.id); if(def) totalPropertyTax += Math.floor(def.price * def.taxRate); });
                    if (totalPropertyTax > 0) { if (this.state.money >= totalPropertyTax) {
        this.state.money -= totalPropertyTax;
    } else {
        this.state.money = 0;
        this.state.auditRisk += 0.2; // 欠稅增加被查緝的風險
        this.log(`【警告】現金不足以繳交全額稅金，已被國稅局盯上！`, 'text-red-500 animate-pulse');
    } this.state.yearDeductions += totalPropertyTax; this.log(`【政府稅金】繳納年度房屋與地價稅共計 $${this.formatMoney(totalPropertyTax)}。`, 'text-yellow'); }
                }
                
                if (this.state.date.getMonth() === 6 && this.state.date.getDate() === 1) {
                    let totalLuxTax = 0; this.state.portfolioLuxury.forEach(item => { const def = DB.luxury.find(l => l.id === item.id); if(def && def.taxRate) totalLuxTax += Math.floor(def.price * def.taxRate); });
                    if (totalLuxTax > 0) { this.state.money -= totalLuxTax; this.state.yearDeductions += totalLuxTax; this.log(`【政府稅金】繳納年度動產牌照/燃料與奢侈稅共計 $${this.formatMoney(totalLuxTax)}。`, 'text-yellow'); }
                }
                if (this.state.date.getMonth() === 6 && this.state.date.getDate() === 15) {
                    this.processExDividend();
                }

                if (isFirstOfMonth && this.state.auditRisk > 0) {
                    if (Math.random() < this.state.auditRisk) {
                        let fine = 0; if (this.state.evadedTaxAmount > 0) fine += this.state.evadedTaxAmount * 3; if (this.state.insiderPenalty > 0) fine += this.state.insiderPenalty; if (fine === 0) fine = Math.floor(this.getNetWorth().total * 0.1);
                        this.state.money = Math.max(0, this.state.money - fine); this.state.stress += 50; this.state.auditRisk = 0; this.state.evadedTaxAmount = 0; this.state.insiderPenalty = 0; this.log(`【⚠️ 跨部會聯合查緝】非法資金、內線交易與逃漏稅被查獲！罰鍰共計 $${this.formatMoney(fine)}！`, 'text-red-500 font-bold animate-pulse');
                    } else { this.state.auditRisk = Math.max(0, this.state.auditRisk - 0.05); }
                }
                
                if (this.state.date.getMonth() === 11 && this.state.date.getDate() === 31) this.openTaxModal();
                
                // 💡 實體營運與股市解耦：公司在假日（週末）依然會持續運作並結算收支！
                this.state.stocks.forEach(s => {
                    if (s.sector === 'semi') {
                        if (typeof CEO_SEMI !== 'undefined') CEO_SEMI.processRevenue(s);
                    } else if (s.sector === 'pharma') {
                        if (typeof CEO_PHARMA !== 'undefined') CEO_PHARMA.processRevenue(s);
                    } else if (s.sector === 'finance') {
                        if (typeof CEO_FINANCE !== 'undefined') CEO_FINANCE.processRevenue(s);
                    } else if (s.sector === 'software_ai') {
                        if (typeof CEO_SOFTWARE !== 'undefined') CEO_SOFTWARE.processRevenue(s);
                    } else if (s.sector === 'telecom') {
                        if (typeof CEO_TELECOM !== 'undefined') CEO_TELECOM.processRevenue(s);
                    } else if (s.sector === 'electronics') {
                        if (typeof CEO_ELECTRONICS !== 'undefined') CEO_ELECTRONICS.processRevenue(s);
                    } else if (s.sector === 'game') {
                        if (typeof CEO_GAME !== 'undefined') CEO_GAME.processRevenue(s);
                    } else if (s.sector === 'auto') {
                        if (typeof CEO_AUTO !== 'undefined') CEO_AUTO.processRevenue(s);
                    } else if (s.sector === 'realestate') {
                        if (typeof CEO_REALESTATE !== 'undefined') CEO_REALESTATE.processRevenue(s);
                    } else if (s.sector === 'retail') {
                        if (typeof CEO_RETAIL !== 'undefined') CEO_RETAIL.processRevenue(s);
                    } else if (s.sector === 'food') {
                        if (typeof CEO_FOOD !== 'undefined') CEO_FOOD.processRevenue(s);
                    } else if (s.sector === 'energy') {
                        if (typeof CEO_ENERGY !== 'undefined') CEO_ENERGY.processRevenue(s);
                    } else if (s.sector === 'transport') {
                        if (typeof CEO_TRANSPORT !== 'undefined') CEO_TRANSPORT.processRevenue(s);
                    }
                });

                if (!isWeekend) this.simulateMacroAndMarket();
                
                this.updateBankRates(); this.recordHistory(); await this.checkMarginCalls(); this.checkGameOver();
                this.updateUI(); this.renderMarket(); this.renderMarginMarket(); this.renderBankAndAssets(); this.renderShopAndAssets(); this.renderCalendar();
                if (document.getElementById('tab-chart').classList.contains('active')) this.renderChart();
                this.state.isProcessingDay = false;
            },

            simulateMacroAndMarket() {
                const diff = this.state.diffParams; let activeNews = null;
                let dailyContagionShocks = {}; 
                this.state.contagionQueue = this.state.contagionQueue.filter(c => { c.delay--; if (c.delay <= 0) { if (!dailyContagionShocks[c.targetSector]) dailyContagionShocks[c.targetSector] = 0; dailyContagionShocks[c.targetSector] += c.impact; return false; } return true; });
                this.state.activeRotations = this.state.activeRotations.filter(r => r.daysLeft-- > 0);
                if (Math.random() < 0.02) {
                    const availableSectors = Object.keys(DB.sectors);
                    if (availableSectors.length >= 2) {
                        const hotSector = availableSectors[Math.floor(Math.random() * availableSectors.length)]; let coldSector = availableSectors[Math.floor(Math.random() * availableSectors.length)]; while(coldSector === hotSector) coldSector = availableSectors[Math.floor(Math.random() * availableSectors.length)];
                        const rotationDays = Math.floor(Math.random() * 5) + 3; const rotationStrength = 0.008 + Math.random() * 0.005; 
                        this.state.activeRotations.push({ sector: hotSector, drift: -rotationStrength, daysLeft: rotationDays }); this.state.activeRotations.push({ sector: coldSector, drift: rotationStrength, daysLeft: rotationDays });
                    }
                }
                let fundamentalDailyGrowth = 0.04 / 250; if (this.state.inflationRate < 0) fundamentalDailyGrowth += (this.state.inflationRate / 250) * 2; this.state.fundamentalValue *= Math.exp(fundamentalDailyGrowth + randomNormal() * 0.001);
                if (Math.random() < 0.002) { this.state.vix += 30; if (Math.random() > 0.5) this.state.fundamentalValue *= 1.15; else this.state.fundamentalValue *= 0.85; }

                if (this.state.scheduledNews) { activeNews = this.state.scheduledNews; this.state.scheduledNews = null;
                } else if(Math.random() < 0.08) {
                    const isBadRoll = Math.random() < diff.badEventProb; const filteredNews = DB.newsPool.filter(n => n.isBad === isBadRoll); const pool = filteredNews.length > 0 ? filteredNews : DB.newsPool;
                    activeNews = pool[Math.floor(Math.random() * pool.length)];
                }

                if (activeNews) {
                    let msg = activeNews.msg; let targetStock = null;
                    if (msg.includes('{stockName}')) {
                        const candidates = activeNews.targetSector ? this.state.stocks.filter(s => s.sector === activeNews.targetSector) : this.state.stocks;
                        if (candidates.length > 0) { targetStock = candidates[Math.floor(Math.random() * candidates.length)]; msg = msg.replace('{stockName}', targetStock.name); } else { activeNews = null; }
                    }
                    if (activeNews) {
                        if (activeNews.stateChange && activeNews.stateChange !== 'none') {
                            if (activeNews.stateChange === 'bull' && this.state.baseRate > 0.06) this.state.marketState = 'flat'; else this.state.marketState = activeNews.stateChange;
                        }
                        if (activeNews.inflationMod) this.state.inflationRate += activeNews.inflationMod;
                        this.log(`【新聞】${msg}`, activeNews.isBad ? 'text-red-400' : 'text-magenta');

                        if (activeNews.sectorEffect) {
                            const secDef = activeNews.sectorEffect;
                            this.state.stocks.forEach(s => { if (s.sector === secDef.target) s.spillover = (s.spillover || 0) + secDef.mod * 0.5; });
                            if (secDef.duration > 0) { const dailyDrift = secDef.mod / secDef.duration; this.state.activeRotations.push({ sector: secDef.target, drift: dailyDrift, daysLeft: secDef.duration }); }
                        }
                        if (activeNews.stockEffect && targetStock) {
                            let stockMod = activeNews.stockEffect.mod; 
                            const stockDuration = activeNews.stockEffect.duration || 1;
                            
                            // ⭕ 【天生領袖】特質實作：若為針對該個股的負面衝擊 (stockMod < 0)
                            const ceoTraits = (targetStock.currentCEO && targetStock.currentCEO.traits) || [];
                            if (stockMod < 0 && ceoTraits.includes('born_leader')) {
                                stockMod *= 0.9; // 跌幅衝擊減少 10%
                            }

                            if (stockMod !== 0) { 
                                const totalPower = stockMod * (1 + stockDuration * 0.2); 
                                targetStock.spillover = (targetStock.spillover || 0) + totalPower; 
                            }
                        }
                    }
                }

                let infDrift = 0; if (this.state.marketState === 'bull') infDrift += 0.0003; if (this.state.marketState === 'bear') infDrift -= 0.0008; infDrift -= (this.state.baseRate - 0.04) * 0.01; 
                this.state.inflationRate = Math.max(-0.02, Math.min(0.15, this.state.inflationRate + infDrift)); 
                const valuationRatio = this.state.marketIndex / this.state.fundamentalValue; this.state.bubbleIndex = Math.max(0, (valuationRatio - 1) * 100);

                if (this.state.cbStance === 'hawkish' && this.state.inflationRate <= 0.035 && this.state.bubbleIndex <= 30) this.state.cbStance = 'neutral';
                else if (this.state.cbStance === 'dovish' && this.state.inflationRate >= 0.015) this.state.cbStance = 'neutral';

                if (this.state.cbStance !== 'neutral') {
                    if (this.state.cbActionCooldown > 0) this.state.cbActionCooldown--;
                    if (this.state.cbActionCooldown <= 0) {
                        if (this.state.cbStance === 'hawkish' && this.state.baseRate < 0.15) { this.state.baseRate += 0.005; this.state.marketState = 'bear'; this.state.cbActionCooldown = 12; }
                        else if (this.state.cbStance === 'dovish' && this.state.baseRate > 0.005) { this.state.baseRate = Math.max(0.005, this.state.baseRate - 0.005); this.state.marketState = 'bull'; this.state.cbActionCooldown = 5; }
                        else if (this.state.cbStance === 'dovish' && this.state.baseRate <= 0.005) { if (Math.random() < 0.2) { this.state.inflationRate += 0.02; this.state.bubbleIndex += 10; this.state.marketState = 'bull'; this.state.cbActionCooldown = 7; } }
                    }
                }
                if (this.state.cbStance === 'neutral') {
                    let needHike = (this.state.inflationRate > 0.05 || this.state.bubbleIndex > 100); let needCut = (this.state.inflationRate < 0);
                    if (needHike) {
                        if (this.state.cbObservation.type !== 'hike') { this.state.cbObservation = { type: 'hike', days: 0, delayTo: 7 }; }
                        else {
                            this.state.cbObservation.days++;
                            if (this.state.cbObservation.days === 7) { if (this.state.inflationRate > 0.06 || this.state.bubbleIndex > 120) { this.state.cbStance = 'hawkish'; this.state.cbObservation.type = null; this.state.cbActionCooldown = 0; } else { this.state.cbObservation.delayTo = 15; } }
                            else if (this.state.cbObservation.days === 15) { this.state.cbStance = 'hawkish'; this.state.cbObservation.type = null; this.state.cbActionCooldown = 0; }
                        }
                    } else if (needCut) {
                        if (this.state.cbObservation.type !== 'cut') { this.state.cbObservation = { type: 'cut', days: 0, delayTo: 7 }; }
                        else {
                            this.state.cbObservation.days++;
                            if (this.state.cbObservation.days === 7) { if (this.state.inflationRate < -0.01) { this.state.cbStance = 'dovish'; this.state.cbObservation.type = null; this.state.cbActionCooldown = 0; } else { this.state.cbObservation.delayTo = 15; } }
                            else if (this.state.cbObservation.days === 15) { this.state.cbStance = 'dovish'; this.state.cbObservation.type = null; this.state.cbActionCooldown = 0; }
                        }
                    } else { if (this.state.cbObservation.type !== null) this.state.cbObservation = { type: null, days: 0, delayTo: 7 }; }
                }

                this.state.marketIndexLast = this.state.marketIndex; let marketDrift = diff.marketDriftMod; marketDrift += Math.log(this.state.fundamentalValue / this.state.marketIndex) * 0.005; 
                if(this.state.marketState === 'bull') marketDrift += 0.003 - (this.state.baseRate * 0.01); else if(this.state.marketState === 'bear') marketDrift += -0.005 - (this.state.baseRate * 0.02); else marketDrift += 0.0005;

                const indexReturn = marketDrift + 0.015 * randomNormal(); this.state.marketIndex *= Math.exp(indexReturn);
                const globalIndexReturn = (marketDrift * 0.8) + 0.015 * randomNormal();

                if (indexReturn < 0) this.state.vix += Math.abs(indexReturn) * 1000 * 1.5; else this.state.vix += indexReturn * 1000 * 0.2;
                this.state.vix = this.state.vix * 0.85 + 15 * 0.15; if(this.state.vix > 100) this.state.vix = 100;
                
                const dynamicVol = this.state.vix / 1000; const foreignNumerics = ['8035', '6758', '005930', '7974', '0700', '9432', '9984', '7203', '1211'];

                this.state.stocks.forEach(s => {
                    const sectorDef = DB.sectors[s.sector];
                    if (s.isListed !== false) {
                        s.lastPrice = s.price; let jump = 0; if (Math.random() < 0.02) jump = randomNormal() * 0.15; 
                    
                    if (s.productCooldown > 0) s.productCooldown--;
                    if (s.productCooldown <= 0 && Math.random() < 0.05) { // 5% 機率觸發發表會
                        // 1. 取得或生成產品名稱
                        let productName = '';
                        if (typeof COMPANY_PRODUCTS !== 'undefined' && COMPANY_PRODUCTS[s.id] && COMPANY_PRODUCTS[s.id].future.length > 0) {
                            const pool = COMPANY_PRODUCTS[s.id].future;
                            s.usedProductNames = s.usedProductNames || [];
                            let availablePool = pool.filter(p => !s.usedProductNames.includes(p));
                            if (availablePool.length === 0) {
                                s.usedProductNames = [];
                                availablePool = pool;
                            }
                            productName = availablePool[Math.floor(Math.random() * availablePool.length)];
                            s.usedProductNames.push(productName);
                        } else {
                            // 動態生成符合板塊風格的產品
                            const adjs = ['次世代', '旗艦級', '全新架構', '突破性', 'AI賦能', '商用級'];
                            const nouns = {
                                'semi': '製程節點與封裝技術', 'electronics': '智能終端設備', 'software_ai': '雲端大語言模型',
                                'game': '3A級遊戲大作', 'auto': '智慧新能源車款', 'finance': '高資產理財專案',
                                'retail': '全球電商整合方案', 'pharma': '標靶治療新藥', 'transport': '綠能環保貨櫃輪'
                            };
                            let adj = adjs[Math.floor(Math.random() * adjs.length)];
                            let noun = nouns[s.sector] || '核心主力產品';
                            productName = `${adj}${noun}`;
                        }

                        // 2. 計算產品市場反饋與利潤 (常態分配)
                        let marketScore = randomNormal(); // 0 是普通，>1是極佳，<-1是極差
                        let eventMsg = '';
                        let isGood = true;
                        let shockPower = 0;

                        if (marketScore > 1.2) {
                            eventMsg = `【重磅發表】震撼市場！發布『${productName}』，預購量爆單，利潤預期大幅上修！`;
                            shockPower = 0.15 + Math.random() * 0.10; // +15% ~ +25% 極強動能
                            isGood = true;
                            // 帶動供應鏈大漲 (連鎖效應)
                            if (sectorDef.links) {
                                Object.entries(sectorDef.links).forEach(([targetSector, linkBeta]) => { 
                                    if (linkBeta > 0) this.state.contagionQueue.push({ targetSector: targetSector, impact: shockPower * 0.5, delay: 1 }); 
                                });
                            }
                            // 如果是玩家的股票，給予全球推播
                            if(s.owned > 0 || s.shortOwned > 0) this.log(`【庫存快訊】您關注的 ${s.name} 發布了『${productName}』取得巨大成功！股價預計將飆升！`, 'text-red-retro font-bold');
                        } else if (marketScore < -1.2) {
                            eventMsg = `【產品危機】『${productName}』發布後爆發嚴重災情與退貨潮，公司緊急召回並認列鉅額虧損！`;
                            shockPower = -(0.15 + Math.random() * 0.15); // -15% ~ -30% 崩盤動能
                            const ceoTraits = (s.currentCEO && s.currentCEO.traits) || [];
                            if (ceoTraits.includes('born_leader')) {
                                shockPower *= 0.9;
                            }

                            isGood = false;
                            if(s.owned > 0 || s.shortOwned > 0) this.log(`【庫存危機】您關注的 ${s.name} 新產品『${productName}』發生災難性失敗！請留意跌停風險！`, 'text-cyan font-bold animate-pulse');
                        } else if (marketScore > 0) {
                            eventMsg = `【產品上線】正式推出『${productName}』，市場評價優良，銷量穩定成長。`;
                            shockPower = 0.03 + Math.random() * 0.05;
                            isGood = true;
                        } else {
                            eventMsg = `【銷售不如預期】新品『${productName}』上市後反應冷淡，未能有效提振本季營收。`;
                            shockPower = -(0.03 + Math.random() * 0.05);
                            isGood = false;
                        }

                        // 3. 套用動能與紀錄公告
                        s.spillover += shockPower; // 影響隨後的股價運算
                        if(!s.companyNews) s.companyNews = [];
                        s.companyNews.push({ date: this.formatDateStr(this.state.date).substring(5), msg: eventMsg, isGood: isGood });
                        if (s.companyNews.length > 8) s.companyNews.shift(); // 最多保留 8 則歷史公告

                        // 重置冷卻時間 (60~120天)
                        s.productCooldown = Math.floor(Math.random() * 60) + 60;
                    }

                    const rateEffect = sectorDef.rateSensitivity * (this.state.baseRate - 0.025) * 0.1 * (1 + randomNormal() * 0.5);
                    let rotationEffect = 0; this.state.activeRotations.forEach(r => { if(r.sector === s.sector) rotationEffect += r.drift; });
                    let contagionEffect = dailyContagionShocks[s.sector] || 0; contagionEffect = contagionEffect * (0.5 + Math.random()); 
                    
                    const isTwStock = /^[0-9]+$/.test(s.id) && !foreignNumerics.includes(s.id);
                    const appliedIndexReturn = isTwStock ? indexReturn : globalIndexReturn;
                    const idiosyncraticShock = randomNormal(); 
                    const mu = sectorDef.trendRate + (s.beta * appliedIndexReturn) + rateEffect + rotationEffect + contagionEffect;
                    const sigma = Math.max(sectorDef.baseVol, dynamicVol * s.beta); 
                    
                    let previousSpillover = s.spillover || 0;
                    const stockReturn = (mu - 0.5 * sigma * sigma) + (sigma * idiosyncraticShock) + jump + previousSpillover;
                    let theoreticalPrice = Math.max(10, Math.floor(s.lastPrice * Math.exp(stockReturn)));
                    s.isLimitUp = false; s.isLimitDown = false;
                    
                    if (isTwStock) {
                        const maxPrice = Math.floor(s.lastPrice * 1.10); const minPrice = Math.max(10, Math.ceil(s.lastPrice * 0.90));
                        if (theoreticalPrice > maxPrice) { s.price = maxPrice; s.isLimitUp = true; s.spillover = (stockReturn - Math.log(maxPrice / s.lastPrice)) * 0.4; }
                        else if (theoreticalPrice < minPrice) { s.price = minPrice; s.isLimitDown = true; s.spillover = (stockReturn - Math.log(minPrice / s.lastPrice)) * 0.4; }
                        else { s.price = theoreticalPrice; s.spillover = 0; }
                    } else { s.price = theoreticalPrice; s.spillover = 0; }

                    if (Math.abs(stockReturn) > 0.08 && Math.random() < 0.4) {
                        if (sectorDef.links && Object.keys(sectorDef.links).length > 0) {
                            Object.entries(sectorDef.links).forEach(([targetSector, linkBeta]) => { this.state.contagionQueue.push({ targetSector: targetSector, impact: stockReturn * linkBeta * (0.8 + Math.random() * 0.4), delay: Math.floor(Math.random() * 3) + 1 }); });
                        }
                    }
                    }
                });
                for (let i = this.state.stocks.length - 1; i >= 0; i--) {
                    let s = this.state.stocks[i];
                    
                    // 新增：如果是未上市企業，直接跳過「護盤、下市、央行倒貨」的審查機制！
                    // (注意：因為這裡是 for 迴圈，所以要用 continue 來跳過本次循環)
                    if (s.isListed === false) continue;

                    if (s.bailoutCooldown > 0) s.bailoutCooldown--;

                    // 1. 央行退場機制：若央行曾入股紓困，且股價回升至發行價 80% 以上，央行將逢高倒貨套現
                    if (s.cbStake && s.cbStake > 0 && s.price > s.basePrice * 0.8) {
                        if (Math.random() < 0.1) { 
                            s.cbStake--;
                            s.spillover -= 0.4; // 國安基金倒貨造成龐大賣壓
                            this.log(`【國安基金退場】${s.name} 營運已回穩，央行宣佈出脫手中紓困持股獲利了結，市場湧現沉重賣壓！`, 'text-cyan font-bold');
                        }
                    }

                    // 2. 定義嚴重下跌危機：股價跌破發行價的 20% 或絕對股價低於 15 元
                    let isDistressed = s.price <= (s.basePrice * 0.2) || s.price <= 15;

                    if (isDistressed && (!s.bailoutCooldown || s.bailoutCooldown <= 0)) {
                        let isTooBigToFail = s.liquidity >= 300000;
                        // 央行救助評估：大到不能倒的權值股有 60% 機率獲救，一般企業只有 20% 機率
                        let bailoutProb = isTooBigToFail ? 0.6 : 0.2;

                        if (Math.random() < bailoutProb) {
                            // 3. 執行救助計畫 (國家隊注資入股)
                            let injectCapital = Math.max(15, Math.floor(s.price * 1.0)); 
                            s.price += injectCapital;
                            s.spillover += 0.6; // 國家隊進場給予後續幾天極強的反彈動能
                            s.bailoutCooldown = 60; // 60天內不重複救助
                            s.cbStake = (s.cbStake || 0) + 1; // 記錄央行持股次數，供日後倒貨用
                            this.log(`【國家隊護盤】${s.name} 股價面臨崩盤危機！央行緊急啟動紓困計畫，宣佈入股注資，帶動股價報復性反彈！`, 'text-yellow font-bold animate-pulse');
                        } else {
                            // 4. 若未獲救助，每天有 10% 機率正式被證交所強制下市
                            if (Math.random() < 0.1) { 
                            
                            // 1. 判斷玩家是否為持股 > 5% 的大股東 (透過大股東申報標記或實質股數預估)
                            let isMajorShareholder = s.hasDeclared && s.hasDeclared.pct5;
                            if (!isMajorShareholder && s.owned >= 50000) isMajorShareholder = true; // 備用防護：持有 5萬股以上即視為大股東

                            // 2. 大股東專屬的「超低價私募增資」救援機會
                            let rescued = false;
                            if (isMajorShareholder) {
                                const rescuePrice = Math.max(0.1, s.price * 0.4).toFixed(2); // 以市價 40% 的破盤價認購
                                const rescueShares = 200000; // 一口氣認購 20萬股
                                const rescueCost = Math.floor(rescueShares * rescuePrice);

                                const wantToRescue = confirm(`【🚨 破產保衛戰：${s.name} 即將下市！】\n\n公司營運資金枯竭，即將遭證交所強制下市！\n身為持股 5% 以上的核心大股東，您有權發起「緊急私募增資」來拯救公司。\n\n您是否願意以每股 $${rescuePrice} 的超低折價，緊急認購 ${rescueShares} 股？\n(總耗資：$${this.formatMoney(rescueCost)})\n\n[說明] 這筆資金將全數注入公司金庫，並帶動股價反彈脫離下市險境！`);

                                if (wantToRescue) {
                                    if (this.state.money >= rescueCost) {
                                        // 扣除玩家個人現金，並全數注入公司營運金庫
                                        this.state.money -= rescueCost;
                                        s.corporateCash = (s.corporateCash || 0) + rescueCost;

                                        // 重新計算玩家持股與被攤平的平均成本
                                        const totalCost = (s.owned * s.avgCost) + rescueCost;
                                        s.owned += rescueShares;
                                        s.avgCost = totalCost / s.owned;

                                        // 強勢拉抬股價脫離危險區，並恢復市場熱度
                                        s.price = Math.max(2.5, s.price + 1.5);
                                        s.lastPrice = s.price;
                                        s.spillover = 1.0; 
                                        
                                        this.log(`【白衣騎士降臨】您果斷出手注資 $${this.formatMoney(rescueCost)}！${s.name} 獲得續命金流，成功從破產邊緣拉回，股價強彈！`, 'text-cyan font-bold text-lg animate-pulse');
                                        rescued = true;
                                    } else {
                                        alert(`【救援失敗】您的私人現金不足！(需 $${this.formatMoney(rescueCost)}) 只能眼睜睜看著公司倒閉...`);
                                    }
                                }
                            }

                            // 3. 如果成功救援，直接跳過後續的下市死亡邏輯
                            if (rescued) continue;
                                this.log(`【⚠️ 黯然下市】${s.name} 因長期營運惡化且未獲政府紓困，今日正式被證交所強制下市！股票淪為壁紙！`, 'text-red-500 font-bold bg-red-900 bg-opacity-30 p-1');

                                // 結算玩家持股部位 (現股價值歸零)
                                if (s.owned > 0) {
                                    let loss = s.owned * s.avgCost;
                                    this.state.yearDeductions += loss;
                                    this.log(`👉 您持有的 ${this.formatMoney(s.owned)} 股 ${s.name} 價值歸零，認列鉅額損失 $${this.formatMoney(loss)}。`, 'text-red-500');
                                }

                                // 結算玩家空單部位 (放空者大獲全勝，免回補賺取全額價差與退還保證金)
                                if (s.shortOwned > 0) {
                                    let profit = s.shortAvgPrice * s.shortOwned;
                                    this.state.money += s.shortMargin; 
                                    
                                    // 【關鍵修復 1】確實釋放被佔用的信用額度，避免玩家信用額度永久卡死！
                                    this.state.lockedMargin -= s.shortMargin; 
                                    
                                    this.state.yearRevenue += profit; 
                                    this.log(`👉 您放空的 ${this.formatMoney(s.shortOwned)} 股 ${s.name} 因下市免回補！保證金全額解凍，暴賺 $${this.formatMoney(profit)}。`, 'text-green-400');
                                }

                                // 【關鍵修復 2】防當機保護：若玩家是該破產公司的 CEO，自動解除職務並切換回市場頁面
                                if (s.playerRole && (s.playerRole.includes('CEO') || s.playerRole.includes('董事長'))) {
                                    this.log(` 🏢 營運終止：您經營的企業已破產，董事會解散，您被迫卸下所有職務。`, 'text-yellow');
                                    const marketBtn = document.querySelector('.tab-btn');
                                    if (marketBtn) this.switchTab('market', marketBtn);
                                }

                                // 從圖表與市場中徹底移除該股票
                                this.state.customChartStocks = this.state.customChartStocks.filter(id => id !== s.id);
                                this.state.stocks.splice(i, 1);
                                this.state.chartTarget = 'index'; // 重置走勢圖視角，避免報錯
                                this.updateChartSelect();
                                
                                // 讓市場生態生生不息：幾天後安排新公司遞補上市
                                setTimeout(() => { this.doIPO(false); }, 3000);
                            }
                        }
                    }
                }

                if(this.state.ipoCooldown > 0) this.state.ipoCooldown--;
                if(this.state.ipoCooldown === 0 && DB.unlistedPool.length > 0 && Math.random() < 0.1) this.doIPO(false);
            },

            doIPO(silent) {
                if(DB.unlistedPool.length === 0) return;
                const idx = Math.floor(Math.random() * DB.unlistedPool.length); 
                const newCorp = DB.unlistedPool.splice(idx, 1)[0];

                // 【核心修正】在重置任何屬性之前，透過多重特徵精確攔截玩家親自創辦或經營的企業
                const isPlayerCompany = newCorp.isPlayerCorp || 
                                        newCorp.foundDate || 
                                        (newCorp.playerRole && (newCorp.playerRole.includes('CEO') || newCorp.playerRole.includes('創辦人') || newCorp.playerRole.includes('董事長')));

                newCorp.price = newCorp.basePrice; 
                newCorp.lastPrice = newCorp.basePrice; 
                // 【關鍵修正】如果是玩家創辦或已持有的公司，必須保留原本的股數與平均成本！
                newCorp.owned = newCorp.owned || 0; 
                newCorp.avgCost = newCorp.avgCost || 0; 
                newCorp.shortOwned = 0;
                newCorp.shortAvgPrice = 0; 
                newCorp.shortMargin = 0; 
                newCorp.spillover = 0; 
                newCorp.isLimitUp = false; 
                newCorp.isLimitDown = false;
                newCorp.companyNews = []; 
                newCorp.productCooldown = Math.floor(Math.random() * 60) + 15;

                if (isPlayerCompany) {
                    // 1. 如果是自創公司上市，直接解鎖大股東股權申報
                    newCorp.hasDeclared = { pct5: true, pct10: true, pct33: true, pct50: true };
                    
                    // 2. 強制鎖定玩家經營身分
                    newCorp.playerRole = 'CEO'; 
                    
                    // 3. 【雙重保險】直接指派一個鏡像玩家 CEO 物件，完美應對 engine.js 與 ceo.js 的所有渲染路徑
                    const playerName = document.getElementById('ui-player-name')?.textContent || "大亨 (您)";
                    newCorp.currentCEO = {
                        id: 'PLAYER_CEO',
                        name: playerName,
                        age: 38,
                        salary: 0, // 玩家兼任不領固定死薪水
                        stats: { leadership: 99, rd: 99, finance: 99, marketing: 99, operations: 99 },
                        traits: [],
                        isPlayer: true
                    };
                    
                    if (typeof CEOMarket !== 'undefined') {
                        CEOMarket.activeCEOs[newCorp.id] = newCorp.currentCEO;
                    }
                } else {
                    // 4. 一般隨機 NPC 公司掛牌上市，維持原本的機制
                    newCorp.hasDeclared = { pct5: false, pct10: false, pct33: false, pct50: false };
                    newCorp.playerRole = '散戶';
                    
                    if (typeof CEOMarket !== 'undefined') {
                        CEOMarket.hireForStock(newCorp);
                    }
                }

                this.state.stocks.push(newCorp); 
                this.state.ipoCooldown = 14 + Math.floor(Math.random() * 14);

                if(!silent) {
                    if (isPlayerCompany) {
                        this.log(`【🎉 敲鐘上市】您親自創辦的企業 ${newCorp.name} 正式掛牌上市！您以『執行長』身分親自掌舵！`, 'text-yellow font-bold animate-pulse');
                    } else {
                        this.log(`【IPO】${newCorp.name} 於證交所掛牌上市！`, 'text-yellow');
                    }
                }
                this.updateChartSelect(); 
                if (this.state.chartTarget === 'custom') this.renderCustomStockCheckboxes();
            },

            openTradeModal(idx, type) {
                if (this.state.hospitalizedDays > 0) {
        this.log("【系統提示】您目前正在住院療養，無法進行任何證券交易！", "text-red-500 font-bold");
        return;
    }
                const isWeekend = this.state.date.getDay() === 0 || this.state.date.getDay() === 6;
                if (isWeekend) {
                    this.log("【系統提示】目前為週末休市時間，證券交易所不開放掛單！", "text-red-500 font-bold");
                    return;
                }
                this.state.currentTrade = { idx, type }; const s = this.state.stocks[idx]; const panel = document.getElementById('modal-trade-panel'); const title = document.getElementById('trade-title');
                document.getElementById('trade-name').innerText = `${s.id} ${s.name}`; document.getElementById('trade-price').innerText = `$${this.formatMoney(s.price)}`;
                
                const getOwnershipPctHtml = (ownedAmount) => {
                    if (ownedAmount === 0 || !s.totalShares) return ''; const pct = (ownedAmount / s.totalShares * 100); const pctStr = pct < 0.00001 ? '< 0.00001' : pct.toFixed(5);
                    return ` <span class="text-[10px] text-yellow ml-2">(占總股本 ${pctStr}%)</span>`;
                };

                if (type === 'buy' || type === 'sell') {
                    document.getElementById('trade-owned').innerHTML = `${this.formatMoney(s.owned)} 股` + getOwnershipPctHtml(s.owned);
                    title.innerText = type === 'buy' ? '現股買入委託單 (BUY)' : '現股賣出委託單 (SELL)'; title.className = type === 'buy' ? 'text-xl mb-4 border-b border-red-800 text-red-retro pb-2 font-bold' : 'text-xl mb-4 border-b border-cyan-800 text-cyan pb-2 font-bold';
                    panel.className = "panel p-6 w-full max-w-sm border-cyan"; document.getElementById('trade-qty').value = type === 'buy' ? 100 : Math.max(100, s.owned);
                } else {
                    document.getElementById('trade-owned').innerHTML = `${this.formatMoney(s.shortOwned)} 股 (空單)` + getOwnershipPctHtml(s.shortOwned);
                    title.innerText = type === 'short' ? '信用放空委託單 (SHORT)' : '空單回補委託單 (COVER)'; title.className = type === 'short' ? 'text-xl mb-4 border-b border-magenta text-magenta pb-2 font-bold' : 'text-xl mb-4 border-b border-yellow-800 text-yellow pb-2 font-bold';
                    panel.className = "panel p-6 w-full max-w-sm border-magenta shadow-[0_0_15px_rgba(255,0,255,0.2)]"; document.getElementById('trade-qty').value = type === 'short' ? 100 : Math.max(100, s.shortOwned);
                }
                this.updateTradeUI(); document.getElementById('modal-trade').classList.remove('hidden');
            },

            updateTradeUI() {
                const qty = parseInt(document.getElementById('trade-qty').value) || 0; const s = this.state.stocks[this.state.currentTrade.idx]; const type = this.state.currentTrade.type;
                const btn = document.getElementById('btn-trade-confirm'); const feeRate = this.state.diffParams.feeRate; const warnLabel = document.getElementById('trade-margin-warn'); const slipLabel = document.getElementById('trade-slippage-warn'); const totalLabel = document.getElementById('trade-total-label'); const totalSpan = document.getElementById('trade-total');
                btn.disabled = false; totalSpan.classList.remove('text-red-500'); warnLabel.innerHTML = `含券商手續費 ${(feeRate*100).toFixed(1)}%`; slipLabel.innerHTML = '';
                if(qty <= 0 || qty % 1 !== 0) { btn.disabled = true; return; }
                const liquidity = s.liquidity || 50000; let slipRate = Math.max(0, (qty / liquidity) * 0.05); if (slipRate > 0.3) slipRate = 0.3; 
                let execPrice = s.price; if (type === 'buy' || type === 'cover') execPrice = s.price * (1 + slipRate); if (type === 'sell' || type === 'short') execPrice = s.price * (1 - slipRate);
                if (slipRate > 0) slipLabel.innerHTML = `⚠️ 大量交易觸發滑價影響成交均價: $${this.formatMoney(execPrice)}`;
                if (type === 'buy') { 
                    const availableShares = Math.max(0, s.totalShares - s.owned);
                    const cost = qty * execPrice * (1 + feeRate); 
                    totalLabel.innerText = "預估扣款:"; 
                    totalSpan.innerText = `$ ${this.formatMoney(cost)}`; 
                    if(cost > this.state.money) { btn.disabled = true; totalSpan.classList.add('text-red-500'); } 
                    
                    // 【新增】檢查輸入股數是否超出剩餘流通股數
                    if (qty > availableShares) {
                        btn.disabled = true;
                        totalSpan.classList.add('text-red-500');
                        slipLabel.innerHTML = `<span class="text-red-500 font-bold animate-pulse">⚠️ 委託失敗：超出市場流通籌碼 (僅剩 ${this.formatMoney(availableShares)} 股)</span>`;
                    }
                }
                else if (type === 'sell') { const earn = qty * execPrice * (1 - feeRate); totalLabel.innerText = "預估入帳:"; totalSpan.innerText = `$ ${this.formatMoney(earn)}`; if(qty > s.owned) { btn.disabled = true; totalSpan.classList.add('text-red-500'); } }
                else if (type === 'short') { const baseVal = qty * execPrice; const requiredCash = (baseVal * 0.5) + (baseVal * feeRate); totalLabel.innerText = "需自備保證金現金:"; totalSpan.innerText = `$ ${this.formatMoney(requiredCash)}`; warnLabel.innerHTML = `含手續費 ${(feeRate*100).toFixed(1)}% | 鎖定 150% 保證金`; if(requiredCash > this.state.money) { btn.disabled = true; totalSpan.classList.add('text-red-500'); } }
                else if (type === 'cover') { const cost = qty * execPrice * (1 + feeRate); const releaseMargin = (qty / s.shortOwned) * s.shortMargin; const refund = releaseMargin - cost; totalLabel.innerText = refund >= 0 ? "預估退回現金:" : "需額外補繳現金:"; totalSpan.innerText = `$ ${this.formatMoney(Math.abs(refund))}`; if(refund < 0) totalSpan.className = "font-bold text-red-500"; if(refund < 0 && Math.abs(refund) > this.state.money) btn.disabled = true; if(qty > s.shortOwned) { btn.disabled = true; totalSpan.classList.add('text-red-500'); } }
            },

            addTradeQty(amount) { const input = document.getElementById('trade-qty'); input.value = Math.max(1, parseInt(input.value || 0) + amount); this.updateTradeUI(); },
            setTradeMax() {
        const s = this.state.stocks[this.state.currentTrade.idx]; 
        const type = this.state.currentTrade.type; 
        const feeRate = this.state.diffParams.feeRate; 
        const input = document.getElementById('trade-qty'); 
        const liquidity = s.liquidity || 50000;

        if (type === 'sell') {
            input.value = Math.max(1, s.owned);
        } else if (type === 'cover') {
            input.value = Math.max(1, s.shortOwned);
        } else {
            // 針對買進(buy)與放空(short)，使用二分搜尋法精準反推「考慮真實滑價後」的最大股數
            let low = 1;
            // 設定一個極端的上限 (手邊現金全部拿去買原本價格的股數)
            let high = Math.floor(this.state.money / (s.price * (type === 'buy' ? 1 : 0.5))); 
            if (high < 1) high = 1;
            if (type === 'buy') {
                const availableShares = Math.max(0, s.totalShares - s.owned);
                if (high > availableShares) high = availableShares;
            }

            let bestQty = 1;
            // 如果連 1 股都買不起，或市場已經被你買光了 (流通股=0)
            if (high < 1) {
                input.value = 0;
                this.updateTradeUI();
                return;
            }

            while (low <= high) {
                let mid = Math.floor((low + high) / 2);
                
                // 模擬真實的滑價計算
                let slipRate = Math.max(0, (mid / liquidity) * 0.05); 
                if (slipRate > 0.3) slipRate = 0.3; 
                
                let execPrice = s.price; 
                let requiredCash = 0;

                if (type === 'buy') {
                    execPrice = s.price * (1 + slipRate);
                    requiredCash = mid * execPrice * (1 + feeRate);
                } else if (type === 'short') {
                    execPrice = s.price * (1 - slipRate); // 放空滑價會讓成交價變低
                    requiredCash = (mid * execPrice * 0.5) + (mid * execPrice * feeRate);
                }

                // 判斷錢夠不夠
                if (requiredCash <= this.state.money) {
                    bestQty = mid; // 錢夠，記錄下來，並嘗試買更多
                    low = mid + 1;
                } else {
                    high = mid - 1; // 錢不夠，減少股數
                }
            }
            // 將精準算出的極限股數填入
            input.value = Math.max(1, bestQty);
        }
        this.updateTradeUI();
    },

            executeTrade() {
                const qty = parseInt(document.getElementById('trade-qty').value); if (isNaN(qty) || qty <= 0) return;
                const s = this.state.stocks[this.state.currentTrade.idx]; const type = this.state.currentTrade.type; const feeRate = this.state.diffParams.feeRate; const liquidity = s.liquidity || 50000;
                let slipRate = Math.max(0, (qty / liquidity) * 0.05); if (slipRate > 0.3) slipRate = 0.3; 
                let execPrice = s.price; if (type === 'buy' || type === 'cover') execPrice = s.price * (1 + slipRate); if (type === 'sell' || type === 'short') execPrice = s.price * (1 - slipRate);

                if (s.isLimitUp && (type === 'buy' || type === 'cover')) { this.log(`【交易失敗】${s.name} 目前漲停鎖死，買盤無人拋售，委託單無法成交！`, "text-red-500 font-bold"); this.closeModal('trade'); return; }
                if (s.isLimitDown && (type === 'sell' || type === 'short')) { this.log(`【交易失敗】${s.name} 目前跌停鎖死，賣盤無人承接，委託單無法成交！`, "text-red-500 font-bold"); this.closeModal('trade'); return; }

                if (type === 'buy' && qty > (s.totalShares - s.owned)) {
                    this.log(`【交易失敗】${s.name} 市場上已無足夠的流通籌碼可供收購！`, "text-red-500 font-bold");
                    this.closeModal('trade');
                    return;
                }

                s.price = Math.max(10, Math.floor(s.price * (type === 'buy' || type === 'cover' ? (1 + slipRate * 0.1) : (1 - slipRate * 0.1))));
                const baseValue = qty * execPrice; const fee = baseValue * feeRate;

                if (type === 'buy') { const cost = baseValue + fee; this.state.money -= cost; const oldTotalCost = s.avgCost * s.owned; s.owned += qty; s.avgCost = (oldTotalCost + cost) / s.owned; }
                else if (type === 'sell') { const earn = baseValue - fee; this.state.money += earn; const profit = earn - (qty * s.avgCost); if (profit > 0) this.state.yearRevenue += profit; else this.state.yearDeductions += Math.abs(profit); s.owned -= qty; if(s.owned === 0) s.avgCost = 0; }
                else if (type === 'short') { const requiredCash = (baseValue * 0.5) + fee; const totalLocked = baseValue * 1.5; this.state.money -= requiredCash; const oldVal = s.shortAvgPrice * s.shortOwned; s.shortOwned += qty; s.shortAvgPrice = (oldVal + baseValue) / s.shortOwned; s.shortMargin += totalLocked; }
                else if (type === 'cover') { const cost = baseValue + fee; const releaseMargin = (qty / s.shortOwned) * s.shortMargin; const refund = releaseMargin - cost; this.state.money += refund; const profit = (s.shortAvgPrice - execPrice) * qty - fee; if (profit > 0) this.state.yearRevenue += profit; else this.state.yearDeductions += Math.abs(profit); s.shortOwned -= qty; s.shortMargin -= releaseMargin; if(s.shortOwned === 0) { s.shortAvgPrice = 0; s.shortMargin = 0; } }

                if (type === 'buy' || type === 'sell') {
                    this.checkOwnershipThresholds(s);
                }

                this.state.lockedMargin = 0; this.state.stocks.forEach(st => this.state.lockedMargin += st.shortMargin);
                this.closeModal('trade'); this.updateUI(); this.renderMarket(); this.renderMarginMarket();
            },

            checkOwnershipThresholds(s) {
    if (!s.hasDeclared) {
        s.hasDeclared = { pct5: false, pct10: false, pct33: false, pct50: false };
    }

    if (!s.totalShares) return;
    const pct = s.owned / s.totalShares;
    
    // 【防護 1】確認玩家目前是否親自兼任該公司 CEO
    const isPlayerCEO = s.playerRole === 'CEO' || (s.currentCEO && s.currentCEO.isPlayer);

    // 統一的身分派發邏輯：永遠優先保障 CEO 頭銜，其次才看持股比例
    const determineRole = () => {
        if (isPlayerCEO) return 'CEO'; 
        if (pct >= 0.50) return '董事長';
        if (pct >= 0.33) return '具否決權大股東';
        if (pct >= 0.10) return '董事會成員';
        if (pct >= 0.05) return '大股東';
        return '散戶';
    };

    // 【防護 2】全部改為獨立 if，確保一口氣買超大量股份時，所有階梯的獎勵與 flag 都能正確觸發
    if (pct >= 0.05 && !s.hasDeclared.pct5) {
        s.hasDeclared.pct5 = true; 
        s.playerRole = determineRole();
        this.log(`【大股東申報】神祕買家曝光！您買入 ${s.name} 達 5% 觸發強制申報，引發市場散戶瘋狂跟單！`, 'text-red-retro font-bold animate-pulse');
        s.spillover += 0.15; 
    }
    if (pct >= 0.10 && !s.hasDeclared.pct10) {
        s.hasDeclared.pct10 = true; 
        s.playerRole = determineRole();
        this.log(`【進入董事會】您正式取得 ${s.name} 10% 股權，獲選為董事，將可提前得知內部機密消息！`, 'text-cyan font-bold');
        s.spillover += 0.08;
    }
    if (pct >= 0.33 && !s.hasDeclared.pct33) {
        s.hasDeclared.pct33 = true; 
        s.playerRole = determineRole();
        this.log(`【股權擴張】您持有 ${s.name} 已達 33%，取得重大議案否決權！`, 'text-magenta font-bold');
        s.spillover += 0.10;
    }
    if (pct >= 0.50 && !s.hasDeclared.pct50) {
        s.hasDeclared.pct50 = true; 
        s.playerRole = determineRole();
        this.log(`【經營權易主】您已收購 ${s.name} 過半股權 (50%) 成為董事長！可隨時至『現任 CEO』頁籤選擇是否親自接任執行長。`, 'text-yellow font-bold text-lg animate-pulse');
        s.spillover += 0.20; 
    }
    
    // 降級檢查 (賣出時)
    if (pct < 0.50 && s.hasDeclared.pct50) { 
        s.hasDeclared.pct50 = false; 
        s.playerRole = determineRole();
        this.log(`【喪失經營權】您出售了 ${s.name} 的過半持股，退出最高決策層。`, 'text-gray-400'); 
    }
    if (pct < 0.33 && s.hasDeclared.pct33) { 
        s.hasDeclared.pct33 = false; 
        s.playerRole = determineRole(); 
    }
    if (pct < 0.10 && s.hasDeclared.pct10) { 
        s.hasDeclared.pct10 = false; 
        s.playerRole = determineRole(); 
    }
    if (pct < 0.05 && s.hasDeclared.pct5) { 
        s.hasDeclared.pct5 = false; 
        s.playerRole = determineRole(); 
    }
},

            tenderOffer(targetPct) {
                const s = this.state.stocks[this.state.currentCompanyIdx];
                let requiredShares = Math.floor(s.totalShares * targetPct);
                let premiumPrice = Math.floor(s.price * 1.20); // 溢價 20%
                let baseCost = requiredShares * premiumPrice;
                let fee = baseCost * this.state.diffParams.feeRate;
                let advisoryFee = baseCost * 0.01; // 1% 併購財務顧問費
                let totalCost = baseCost + fee + advisoryFee;
                
                const availableShares = Math.max(0, s.totalShares - s.owned);
                if (requiredShares > availableShares) {
                    let leftPct = (availableShares / s.totalShares * 100).toFixed(1);
                    this.log(`【收購失敗】市場上已無足夠的籌碼可供收購！(最高僅能再收購 ${leftPct}%)`, 'text-red-500 font-bold');
                    return;
                }

                if (this.state.money < totalCost) {
                    this.log(`【收購失敗】現金不足！公開收購 ${targetPct*100}% 需要 $${this.formatMoney(totalCost)} (含 1% 併購顧問費 $${this.formatMoney(advisoryFee)})。`, 'text-red-500 font-bold');
                    return;
                }
                
                this.state.money -= totalCost;

                // M&A 財務顧問費分潤 Feedback Loop
                let investmentBanks = this.state.stocks.filter(x => x.sector === 'finance' && x.bizModel === 'investment');
                if (investmentBanks.length > 0) {
                    // 按市值大小排序，選出龍頭投行
                    investmentBanks.sort((a, b) => (b.totalShares * b.price) - (a.totalShares * a.price));
                    let leadBank = investmentBanks[0];
                    let bankShare = Math.floor(advisoryFee * 0.5); // 投行獲得 50% 顧問淨收益
                    leadBank.corporateCash = (leadBank.corporateCash || 0) + bankShare;
                    leadBank.monthRevenue = (leadBank.monthRevenue || 0) + bankShare;
                    this.log(`【併購顧問分成】🤝 投資銀行與資管巨頭 ${leadBank.name} 擔任本次股權併購案之財務顧問，獲取大額交易撮合顧問費 +$${this.formatMoney(bankShare)}！`, 'text-purple-400 font-bold');
                }

                let oldTotalCost = s.avgCost * s.owned;
                s.owned += requiredShares;
                s.avgCost = (oldTotalCost + totalCost) / s.owned;
                
                s.price = premiumPrice; // 股價瞬間被收購價推升
                this.log(`【公開收購成功】您以溢價 20% ($${this.formatMoney(premiumPrice)}) 成功向市場收購 ${s.name} ${targetPct*100}% 股權！`, 'text-cyan font-bold');
                
                this.checkOwnershipThresholds(s); 
                this.updateUI();
                this.renderMarket();
                this.openCompanyInfo(this.state.currentCompanyIdx); 
            },

            proxyFight() {
                const s = this.state.stocks[this.state.currentCompanyIdx];
                const cost = Math.floor(this.state.money * 0.2); 
                
                if (cost < 5000000) { 
                    this.log('【委託書大戰失敗】你的現金儲備過低 (需至少 500 萬作戰資金)，無法撼動原經營團隊！', 'text-red-500 font-bold');
                    return;
                }
                this.state.money -= cost;
                
                let baseProb = 0.3; 
                if (this.state.taxDiscount >= 0.5) baseProb += 0.2; 
                if (this.state.comfort >= 20) baseProb += 0.2; 
                
                if (Math.random() < baseProb) {
                    if (s.playerRole !== 'CEO') s.playerRole = '董事長';
                    s.hasDeclared.pct50 = true; 
                    this.log(`【政變成功】耗資 $${this.formatMoney(cost)} 收購委託書成功！您成功將原團隊掃地出門奪得 ${s.name} 經營權成為董事長！可隨時至『現任 CEO』頁籤選擇是否接任執行長。`, 'text-yellow font-bold text-lg animate-pulse');
                    s.spillover += 0.2; 
                } else {
                    this.log(`【政變失敗】耗資 $${this.formatMoney(cost)} 徵求委託書，但原公司派發動反擊，您未能跨過 50% 支持門檻，政變以失敗告終。`, 'text-red-500 font-bold');
                    s.spillover -= 0.1; 
                }
                
                this.updateUI();
                this.renderMarket();
                this.openCompanyInfo(this.state.currentCompanyIdx); 
            },

            buyAsset(type, id) {
                const pool = type === 're' ? DB.realEstate : DB.luxury; const target = type === 're' ? this.state.portfolioRE : this.state.portfolioLuxury; const def = pool.find(x => x.id === id);
                let luxuryTax = def.price >= 10000000 ? Math.floor(def.price * 0.1) : 0; let isFirstHomeExempt = false;
                if (type === 're' && this.state.portfolioRE.length === 0 && luxuryTax > 0) { luxuryTax = 0; isFirstHomeExempt = true; }
                const totalCost = def.price + luxuryTax;
                if (this.state.money >= totalCost) {
                    this.state.money -= totalCost; target.push({ instanceId: 'I_'+Date.now(), id: def.id, buyPrice: def.price }); if(type !== 're') this.state.comfort += def.comfort;
                    let logMsg = `【資產】購入 ${def.name}。`; if (luxuryTax > 0) logMsg += ` 依法扣繳 10% 單次豪華稅 $${this.formatMoney(luxuryTax)}。`; else if (isFirstHomeExempt) logMsg += ` (符合無殼蝸牛首購條件，免徵千萬級豪華稅！)`;
                    this.log(logMsg, 'text-cyan'); this.updateUI(); this.renderShopAndAssets();
                } else { this.log(`現金不足！(包含豪華稅共需 $${this.formatMoney(totalCost)})`, "text-red-500 font-bold"); }
            },

            sellAsset(type, instanceId) {
                if (type !== 're') return; const idx = this.state.portfolioRE.findIndex(x => x.instanceId === instanceId);
                if (idx > -1) {
                    const item = this.state.portfolioRE[idx];
                    if (this.state.residence.type === 'own' && this.state.residence.instanceId === instanceId) { this.state.residence = { type: 'none', id: null, instanceId: null }; this.log(`【警告】您賣出了目前居住的房屋，現在無家可歸了！`, 'text-red-500 animate-pulse font-bold'); }
                    this.state.portfolioRE.splice(idx, 1); const def = DB.realEstate.find(x => x.id === item.id); const settleDate = new Date(this.state.date); settleDate.setDate(settleDate.getDate() + def.liquidityDays); const netEarn = Math.floor(def.price * 0.99); const reProfit = netEarn - item.buyPrice;
                    if(reProfit > 0) this.state.yearRevenue += reProfit; else this.state.yearDeductions += Math.abs(reProfit);
                    this.addCalendarEvent(settleDate, 're_sell', `賣出尾款`, netEarn, { cost: item.buyPrice }); this.log(`【資產】已委託仲介賣出 ${def.name}，預計 ${def.liquidityDays} 天後入帳。`, 'text-yellow');
                    this.updateUI(); this.renderShopAndAssets(); this.renderCalendar();
                }
            },

            rentProperty(id) {
                const def = DB.realEstate.find(r => r.id === id); const initialRent = Math.floor(def.rent * this.state.priceMultiplier);
                if (this.state.money < initialRent) { this.log("現金不足以支付首月租金！", "text-red-500"); return; }
                this.state.money -= initialRent; this.state.residence = { type: 'rent', id: id, instanceId: null };
                this.log(`【租屋】簽約承租 ${def.name}，支付首月租金 $${this.formatMoney(initialRent)}。`, "text-cyan"); this.updateUI(); this.renderShopAndAssets();
            },
            cancelRent() { this.state.residence = { type: 'none', id: null, instanceId: null }; this.log(`【退租】已搬離租屋處，目前無家可歸。`, "text-yellow"); this.updateUI(); this.renderShopAndAssets(); },
            moveIn(instanceId) {
                const item = this.state.portfolioRE.find(i => i.instanceId === instanceId);
                if (item) { this.state.residence = { type: 'own', id: item.id, instanceId: instanceId }; const def = DB.realEstate.find(r => r.id === item.id); this.log(`【喬遷】搬入自有資產 ${def.name}。`, "text-green-400"); this.updateUI(); this.renderShopAndAssets(); }
            },

            processMonthlySettlement() {
                let income = 0; let expense = 0; let msg = "【月初結算】";
                if (this.state.residence.type === 'rent') {
                    const def = DB.realEstate.find(r => r.id === this.state.residence.id);
                    if (def) {
                        const actualRent = Math.floor(def.rent * this.state.priceMultiplier);
                        if (this.state.money >= actualRent) { 
                            this.state.money -= actualRent; 
                            this.state.yearDeductions += actualRent; 
                            msg += `支付租金 $${this.formatMoney(actualRent)}。 `; 
                        } else { 
                            this.state.residence = { type: 'none', id: null, instanceId: null }; 
                            this.state.stress += 30; 
                            this.log(`【強制驅離】付不出租金！被房東趕出 ${def.name}，流落街頭！壓力暴增。`, 'text-red-500 font-bold animate-pulse'); 
                        }
                    }
                }

                this.state.portfolioRE.forEach(re => {
                    const def = DB.realEstate.find(r => r.id === re.id);
                    if (!(this.state.residence.type === 'own' && this.state.residence.instanceId === re.instanceId)) income += def.rent; 
                    expense += Math.floor(def.price * (def.maint / 12));
                });
                
                let hapBonus = 0;
                this.state.portfolioLuxury.forEach(l => { 
                    const def = DB.luxury.find(x => x.id === l.id); 
                    if(def && def.hapMonthly) hapBonus += def.hapMonthly; 
                });
                
                if(hapBonus > 0) { 
                    this.state.happiness = Math.min(100, this.state.happiness + hapBonus); 
                    msg += `休閒資產帶來了 ${hapBonus} 點幸福感。`; 
                }


                // 新增：迴圈檢查所有公司，找出玩家擔任 CEO 的企業來發薪水
                this.state.stocks.forEach(s => {
                    // --- [修正補強] 增加 s.employees 的存在性防錯檢查 ---
                    if (s.playerRole && s.playerRole.includes('CEO') && s.employees) {
                        let quitMsg = '';
                        ['cto', 'cmo', 'cfo'].forEach(role => {
                            let emp = s.employees[role];
                            if (emp) {
                                if (emp.payType === 'cash') {
                                    // 扣除現金薪水
                                    if (s.corporateCash >= emp.salary) {
    s.corporateCash -= emp.salary;
    s.monthExpense = (s.monthExpense || 0) + emp.salary; // 👈 補上這行，正確記入損益表開銷
} else {
                                        // 公司發不出薪水，主管辭職！
                                        quitMsg += `${role.toUpperCase()} ${emp.name}、`;
                                        s.employees[role] = null;
                                        s.spillover -= 0.05; // 人事動盪引發股價下挫
                                    }
                                } else if (emp.payType === 'stock') {
                                    // 認股權發放：增加總股本 (印股票)
                                    s.totalShares += emp.stockDemand;
                                    let dilutionRatio = (s.totalShares - emp.stockDemand) / s.totalShares;
                                    s.price = Math.max(10, Math.floor(s.price * dilutionRatio));
                                }
                            }
                        });
                        if (quitMsg !== '') {
                            this.log(`【人事地震】${s.name} 帳上現金枯竭發不出薪資！${quitMsg}憤而辭職，引發市場恐慌拋售。`, 'text-red-500 font-bold animate-pulse');
                        }
                    }
                });
                
                this.state.money += (income - expense); 
                this.state.yearRevenue += income; 
                this.state.yearDeductions += expense;
                
                if(income > 0 || expense > 0) {
                    this.log(`${msg} 總被動收入 $${this.formatMoney(income)}, 相關支出 $${this.formatMoney(expense)}。`, 'text-cyan');
                }
            },

            processExDividend() {
                let totalCashEarned = 0;
                let totalCashLost = 0;
                let msgList = [];

                this.state.stocks.forEach(s => {
                    if (s.divYield <= 0) return;
                    
                    // 1. 動態營運狀況：用目前的股價位階對比發行價，模擬今年公司賺不賺錢
                    let performanceMod = (s.price / (s.basePrice || s.price)) * (0.8 + Math.random() * 0.4);
                    let actualYield = s.divYield * this.state.diffParams.divMult * performanceMod;
                    if (actualYield < 0.005) actualYield = 0; // 營運太差不配息

                    if (actualYield > 0) {
                        // 2. 決定配息 (現金) 與配股 (股票) 比例
                        // 高波動的高成長股有較高機率保留現金並發放股票股利
                        let stockDivRatio = s.beta > 1.3 ? 0.3 : 0.0; 
                        let cashYield = actualYield * (1 - stockDivRatio);
                        let stockYield = actualYield * stockDivRatio;

                        let cashDivPerShare = Math.floor(s.price * cashYield);
                        if (cashDivPerShare < 1 && stockYield === 0) return;

                        // 3. 真實除權息缺口：(原股價 - 現金股利) / (1 + 股票股利比例)
                        let oldPrice = s.price;
                        let newPrice = Math.max(10, Math.floor((oldPrice - cashDivPerShare) / (1 + stockYield)));
                        s.price = newPrice;
                        
                        // [關鍵修復] 同步擴張公司的總發行股本 (全體股東依比例配發股票股利)
                        if (stockYield > 0) {
                            s.totalShares += Math.floor(s.totalShares * stockYield);
                        }
                        
                        // 4. 多方清算 (持有現股者領取股利)
                        if (s.owned > 0) {
                            let cashGot = s.owned * cashDivPerShare;
                            let sharesGot = Math.floor(s.owned * stockYield);
                            
                            if (cashGot > 0 || sharesGot > 0) {
                                this.state.money += cashGot;
                                this.state.yearRevenue += cashGot;
                                totalCashEarned += cashGot;
                                
                                // 除權息會按比例降低你的持有均價成本
                                let oldTotalCost = s.owned * s.avgCost;
                                s.owned += sharesGot;
                                s.avgCost = (oldTotalCost - cashGot) / s.owned; 
                                if (s.avgCost < 0) s.avgCost = 0;
                                
                                msgList.push(`${s.name} (+${cashGot > 0 ? '$'+this.formatMoney(cashGot) : ''}${sharesGot > 0 ? ' / '+sharesGot+'股' : ''})`);
                            }
                        }
                        
                        // 5. 空方清算 (融券放空者必須賠償股利)
                        if (s.shortOwned > 0) {
                            let cashPay = s.shortOwned * cashDivPerShare;
                            let sharesPay = Math.floor(s.shortOwned * stockYield); // 空方要補回配發的股票缺口
                            
                            if (cashPay > 0 || sharesPay > 0) {
                                this.state.money -= cashPay;
                                this.state.yearDeductions += cashPay;
                                totalCashLost += cashPay;
                                
                                // 更新放空均價與數量
                                let oldTotalShortVal = s.shortOwned * s.shortAvgPrice;
                                s.shortOwned += sharesPay;
                                s.shortAvgPrice = (oldTotalShortVal - cashPay) / s.shortOwned;
                                
                                msgList.push(`空單 ${s.name} (-$${this.formatMoney(cashPay)}${sharesPay > 0 ? ' / 補'+sharesPay+'股' : ''})`);
                            }
                        }
                    }
                });

                if (msgList.length > 0) {
                    let finalMsg = `【💰 超級除權息日】各公司依年度營運結算配發股利！`;
                    if (totalCashEarned > 0) finalMsg += ` 您總計領取現金 $${this.formatMoney(totalCashEarned)}。`;
                    if (totalCashLost > 0) finalMsg += ` 您的空單補償扣款 $${this.formatMoney(totalCashLost)}。`;
                    this.log(finalMsg, 'text-yellow font-bold');
                    this.log(`入帳明細：${msgList.join(', ')}`, 'text-cyan');
                } else {
                    this.log(`【除權息日】市場進行除息結算，但您手中目前無任何參與配發的股票。`, 'text-gray-500');
                }
            },

            calculateProgressiveTax(taxableIncome) {
                if (taxableIncome <= 0) return 0;
                let tax = 0; let previousLimit = 0;
                const brackets = [ 
                    { limit: 2000000, rate: 0 }, 
                    { limit: 10000000, rate: 0.1 }, 
                    { limit: 50000000, rate: 0.2 }, 
                    { limit: 200000000, rate: 0.35 }, 
                    { limit: Infinity, rate: 0.5 } 
                ];
                for (let b of brackets) { 
                    let chunk = Math.min(taxableIncome, b.limit) - previousLimit; 
                    if (chunk > 0) tax += chunk * b.rate; 
                    previousLimit = b.limit; 
                    if (taxableIncome <= b.limit) break; 
                }
                return Math.floor(tax);
            },

            openTaxModal() {
                const net = Math.max(0, Math.floor(this.state.yearRevenue) - Math.floor(this.state.yearDeductions));
                const baseTax = this.calculateProgressiveTax(net); 
                this.state.pendingTax = Math.floor(baseTax * (1 - this.state.taxDiscount));
                
                document.getElementById('tax-rev').innerText = `$ ${this.formatMoney(this.state.yearRevenue)}`; 
                document.getElementById('tax-ded').innerText = `$ ${this.formatMoney(this.state.yearDeductions)}`; 
                document.getElementById('tax-net').innerText = `$ ${this.formatMoney(net)}`;
                
                let taxHtml = this.state.taxDiscount > 0 ? `<span class="text-gray-400 line-through text-sm mr-2">$ ${this.formatMoney(baseTax)}</span>` : ''; 
                taxHtml += `$ ${this.formatMoney(this.state.pendingTax)}`;
                
                document.getElementById('tax-amount').innerHTML = taxHtml; 
                document.getElementById('tax-discount-label').innerText = this.state.taxDiscount > 0 ? `(已抵扣 ${Math.floor(this.state.taxDiscount * 100)}%)` : '';
                document.getElementById('modal-tax').classList.remove('hidden');
            },

            payTax(type) {
                const tax = this.state.pendingTax;
                if (type === 'honest') {
                    if(this.state.money < tax) { 
                        this.triggerGameOver("稅務破產。無法支付稅金，資產遭查封。"); 
                        return; 
                    }
                    this.state.money -= tax; 
                    this.log(`【稅務】年度申報完成。依法繳納稅額 $${this.formatMoney(tax)}。`, 'text-cyan');
                } else if (type === 'evade') {
                    const fee = Math.floor(tax * 0.1); 
                    if(this.state.money < fee) { 
                        this.log("現金不足以支付會計師手續費！", "text-red-500"); 
                        return; 
                    }
                    this.state.money -= fee; 
                    this.state.auditRisk += 0.20; 
                    this.state.evadedTaxAmount += tax; 
                    this.log(`【稅務】透過黑心會計師作帳成功。支付手續費 $${this.formatMoney(fee)}，逃漏鉅額稅款。`, 'text-magenta');
                }
                this.state.yearRevenue = 0; 
                this.state.yearDeductions = 0; 
                this.state.pendingTax = 0; 
                this.state.taxDiscount = 0; 
                document.getElementById('modal-tax').classList.add('hidden'); 
                this.updateUI();
            },

            getNetWorth() {
                let nw = this.state.money; let totalLoan = 0;
                Object.values(this.state.accounts).forEach(a => { nw += a.deposit; });
                this.state.activeLoans.forEach(l => { totalLoan += l.principal; });
                this.state.stocks.forEach(s => { 
                    nw += s.price * s.owned; 
                    if(s.shortOwned > 0) { nw += s.shortMargin - (s.shortOwned * s.price); } 
                });
                this.state.portfolioRE.forEach(re => nw += DB.realEstate.find(r => r.id === re.id).price);
                this.state.portfolioLuxury.forEach(l => nw += DB.luxury.find(x => x.id === l.id).price * 0.5); 
                return { total: nw - totalLoan, nwRaw: nw, totalLoan };
            },

            getShortExposure() {
                let exposure = 0; 
                this.state.stocks.forEach(s => { if (s.shortOwned > 0) exposure += s.shortOwned * s.price; }); 
                return exposure;
            },

            async checkMarginCalls() {
                const feeRate = this.state.diffParams.feeRate;
                for (let i = 0; i < this.state.stocks.length; i++) {
                    let s = this.state.stocks[i];
                    if (s.shortOwned > 0) {
                        const currentRatio = s.shortMargin / (s.shortOwned * s.price);
                        if (currentRatio < 1.3) {
                            const requiredMargin = Math.floor(s.shortOwned * s.price * 1.3); 
                            let deficit = requiredMargin - s.shortMargin;
                            
                            if (this.state.money < deficit) {
                                const success = await this.promptLiquidation(deficit - this.state.money, `${s.name} 空單維持率過低 (${(currentRatio*100).toFixed(1)}%)，需補繳保證金！`);
                                if(!success) { this.log(`【追繳失敗】放棄籌措保證金或無股可賣。`, 'text-red-500'); }
                            }
                            if (this.state.money >= deficit) {
                                this.state.money -= deficit; 
                                s.shortMargin += deficit; 
                                this.log(`【保證金追繳 (Margin Call)】${s.name} 空單維持率過低，已成功扣除/變現現金 $${this.formatMoney(deficit)} 補足維持率至130%。`, "text-yellow");
                            } else {
                                const liability = s.shortOwned * s.price; 
                                this.state.money += s.shortMargin - liability * (1 + feeRate); 
                                const profit = (s.shortAvgPrice * s.shortOwned) - liability - liability * feeRate;
                                
                                if (profit > 0) this.state.yearRevenue += profit; 
                                else this.state.yearDeductions += Math.abs(profit);
                                
                                this.log(`【💥 斷頭清算】${s.name} 維持率跌破 130% 且無力補足！券商已強制平倉空單並沒收保證金。`, "text-red-500 font-bold bg-red-900 bg-opacity-30 p-1");
                                s.shortOwned = 0; s.shortAvgPrice = 0; s.shortMargin = 0; 
                                this.state.stress += 30; 
                            }
                        }
                    }
                }
                this.state.lockedMargin = 0; 
                this.state.stocks.forEach(s => this.state.lockedMargin += s.shortMargin);
            },

            checkGameOver() {
                if (this.state.health <= 0) { this.triggerGameOver("健康耗盡。過度飢餓或生病離世。"); return; }
                if (this.state.stress >= 100) { 
        let medicalFee = Math.floor(50000 * this.state.priceMultiplier); 
        this.state.money = Math.max(0, this.state.money - medicalFee); 
        this.state.stress = 0;  
        this.state.health = Math.max(50, this.state.health); 
        
        this.state.hospitalizedDays = 7; // 設定住院 7 天
        
        this.log(`【🚨 急救住院】因無法承受巨大壓力引發休克！緊急送醫搶救。(支付醫療費 $${this.formatMoney(medicalFee)})。接下來的 7 天您無法工作與交易，請點擊日常行動按鈕來休養度日。`, "text-red-500 font-bold animate-pulse");
        return; }
                const nwData = this.getNetWorth(); const shortExp = this.getShortExposure();
                if (shortExp > 0 && nwData.total < shortExp * 0.2) { this.triggerGameOver("斷頭清算。空單虧損過大，券商強制平倉並宣告破產。"); return; }
                if (this.state.money < 0 && nwData.total < 0) { this.triggerGameOver("宣告破產。總資產無法償還龐大債務，遭法院強制清算。"); }
            },

            triggerGameOver(msg) { 
                this.state.isGameOver = true; 
                document.getElementById('modal-gameover').classList.remove('hidden'); 
                document.getElementById('gameover-reason').innerText = msg; 
            },

            updateUI() {
                const dateStr = this.formatDateStr(this.state.date);
                // [關鍵修正] 同時檢查玩家是否擁有 'CEO' 或 '董事長' 頭銜，確保導覽頁籤按鈕持續顯示
                const hasExecutiveAccess = this.state.stocks.some(s => s.playerRole && (s.playerRole.includes('CEO') || s.playerRole.includes('董事長')));
                const navCeoBtn = document.getElementById('nav-ceo-tab');
                if (navCeoBtn) {
                    if (hasExecutiveAccess) {
                        navCeoBtn.classList.remove('hidden');
                        // [新增] 核心經營頁面在操作（換日或有任何 UI 更新）時同步刷新
                        const ceoTabContent = document.getElementById('tab-ceo');
                        if (ceoTabContent && ceoTabContent.classList.contains('active')) {
                            if (typeof CEO_MODULE !== 'undefined' && CEO_MODULE.currentTab) {
                                CEO_MODULE.switchTab(CEO_MODULE.currentTab);
                            }
                        }
                    } else {
                        navCeoBtn.classList.add('hidden');
                        // 若失去最高決策層資格且目前正停留在該分頁，強制切換回庫存頁面，避免卡死
                        const ceoTabContent = document.getElementById('tab-ceo');
                        if (ceoTabContent && ceoTabContent.classList.contains('active')) {
                            this.switchTab('portfolio', null); 
                        }
                    }
                } 
                const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
                document.getElementById('ui-date').innerText = dateStr.replace(/-/g, '/'); 
                document.getElementById('ui-weekday').innerText = `(${weekdays[this.state.date.getDay()]})`;
                
                const isWeekend = this.state.date.getDay() === 0 || this.state.date.getDay() === 6; 
                const marketStatusBadge = document.getElementById('market-status-badge');
                if(isWeekend) { 
                    marketStatusBadge.innerText = '休市中'; 
                    marketStatusBadge.className = 'bg-red-retro px-3 py-1 rounded text-sm font-bold'; 
                } else { 
                    marketStatusBadge.innerText = '交易中'; 
                    marketStatusBadge.className = 'bg-green-800 text-green-300 px-3 py-1 rounded text-sm font-bold animate-pulse'; 
                }

                let stateStr = this.state.marketState === 'bull' ? '牛市 (Bull)' : (this.state.marketState === 'bear' ? '熊市 (Bear)' : '盤整 (Flat)');
                let stateColor = this.state.marketState === 'bull' ? 'text-red-retro' : (this.state.marketState === 'bear' ? 'text-cyan' : 'text-yellow');
                document.getElementById('ui-market-state').innerHTML = `<span class="${stateColor}">${stateStr}</span>`;
                
                document.getElementById('ui-interest-rate').innerText = (this.state.baseRate * 100).toFixed(2) + '%'; 
                document.getElementById('ui-vix').innerText = this.state.vix.toFixed(1); 
                document.getElementById('ui-inflation').innerText = (this.state.inflationRate * 100).toFixed(2) + '%';
                
                document.getElementById('ui-money').innerText = `$ ${this.formatMoney(this.state.money)}`; 
                document.getElementById('ui-locked-margin').innerText = `$ ${this.formatMoney(this.state.lockedMargin)}`; 
                document.getElementById('ui-audit-risk').innerText = (this.state.auditRisk * 100).toFixed(0);
                
                const nwData = this.getNetWorth(); 
                document.getElementById('ui-networth').innerText = `$ ${this.formatMoney(nwData.total)}`;
                
                let totalDep = 0; 
                Object.values(this.state.accounts).forEach(a => totalDep += a.deposit); 
                document.getElementById('ui-deposit').innerText = `$ ${this.formatMoney(totalDep)}`;
                
                document.getElementById('ui-loan').innerText = `$ ${this.formatMoney(nwData.totalLoan)}`;
                document.getElementById('ui-gains').innerText = `$ ${this.formatMoney(Math.max(0, this.state.yearRevenue - this.state.yearDeductions))}`;
                
                let estPropertyTax = 0; 
                this.state.portfolioRE.forEach(item => { const def = DB.realEstate.find(r => r.id === item.id); if(def && def.taxRate) estPropertyTax += Math.floor(def.price * def.taxRate); }); 
                this.state.portfolioLuxury.forEach(item => { const def = DB.luxury.find(l => l.id === item.id); if(def && def.taxRate) estPropertyTax += Math.floor(def.price * def.taxRate); });
                if(document.getElementById('ui-property-tax')) document.getElementById('ui-property-tax').innerText = `$ ${this.formatMoney(estPropertyTax)}`;
                
                ['health', 'satiety', 'happiness', 'stress'].forEach(stat => { 
                    document.getElementById(`ui-${stat}-val`).innerText = Math.floor(this.state[stat]); 
                    document.getElementById(`ui-${stat}-bar`).style.width = `${Math.floor(this.state[stat])}%`; 
                });
                
                document.getElementById('ui-comfort').innerText = this.state.comfort;
                
                const idxChange = this.state.marketIndexLast > 0 ? ((this.state.marketIndex - this.state.marketIndexLast) / this.state.marketIndexLast) * 100 : 0; 
                const idxSign = idxChange >= 0 ? '▲' : '▼'; 
                const idxColor = idxChange >= 0 ? 'text-red-retro' : 'text-green-500';
                document.getElementById('ui-index-value').innerHTML = `${this.state.marketIndex.toFixed(2)} <span class="text-sm ${idxColor}">${idxSign} ${Math.abs(idxChange).toFixed(2)}%</span>`;
                
                if (this.state.taxDiscount > 0) { 
                    document.getElementById('ui-tax-discount-hint').classList.remove('hidden'); 
                    document.getElementById('ui-tax-discount-hint').innerText = `已獲減免 ${Math.floor(this.state.taxDiscount*100)}%`; 
                    document.getElementById('ui-tax-discount').innerText = `${Math.floor(this.state.taxDiscount*100)}%`; 
                } else { 
                    document.getElementById('ui-tax-discount-hint').classList.add('hidden'); 
                    document.getElementById('ui-tax-discount').innerText = `0%`; 
                }
                
                const existingUnsecured = this.state.activeLoans.filter(l => l.type === 'unsecured').reduce((sum, l) => sum + l.principal, 0); 
                const creditLimit = Math.max(0, Math.floor(nwData.total * 0.2) - existingUnsecured); 
                document.getElementById('ui-credit-limit').innerText = `$ ${this.formatMoney(creditLimit)}`;
                
                this.renderResidenceInfo();
            },

            renderMarket() {
                let htmlTw = ''; let htmlGlobal = ''; let portTw = ''; let portGlobal = '';
                const foreignNumerics = ['8035', '6758', '005930', '7974', '0700', '9432', '9984', '7203', '1211'];

                this.state.stocks.forEach((s, idx) => {
  if (s.isListed === false) return; // 若公司未上市，跳過不渲染在市場清單
                    const sectorDef = DB.sectors[s.sector]; const sectorName = sectorDef ? sectorDef.name : '未知'; const sectorColor = SECTOR_COLORS[s.sector] || '#ffffff';
                    const change = s.lastPrice > 0 ? ((s.price - s.lastPrice) / s.lastPrice) * 100 : 0; 
                    const absChange = Math.abs(s.price - (s.lastPrice || s.price)); 
                    const sign = change >= 0 ? '▲' : '▼'; const signMath = change >= 0 ? '+' : '-'; const color = change >= 0 ? 'text-red-retro' : 'text-cyan';
                    
                    let pnl = 0; let pnlStr = '-'; let pnlColor = 'text-gray-500'; let pnlPctStr = '';
                    if (s.owned > 0) { 
                        pnl = (s.price - s.avgCost) * s.owned; 
                        pnlStr = (pnl >= 0 ? '+' : '') + this.formatMoney(pnl); 
                        pnlColor = pnl >= 0 ? 'text-red-retro' : 'text-cyan'; 
                        pnl = (s.price - s.avgCost) * s.owned; 
                        pnlStr = (pnl >= 0 ? '+' : '') + this.formatMoney(pnl); 
                        pnlColor = pnl >= 0 ? 'text-red-retro' : 'text-cyan'; 
                        
                        // 【核心修正】若成本大於 0 才進行除法計算，否則回傳 0 進行安全過濾
                        const pnlPct = s.avgCost > 0 ? ((s.price - s.avgCost) / s.avgCost) * 100 : 0; 
                        
                        // 【顯示優化】如果成本是 0 且手上有持股，％數直接霸氣顯示為代表無本暴利的 (∞%)
                        pnlPctStr = `<div class="text-[10px]">(${s.avgCost > 0 ? (pnl >= 0 ? '+' : '') + pnlPct.toFixed(1) + '%' : '∞%'})</div>`; 
                    }

                    let limitBadge = '';
                    if (s.isLimitUp) limitBadge = '<span class="px-1 ml-1 rounded text-[9px] animate-pulse" style="background-color: #ff4444; color: white;">漲停</span>';
                    if (s.isLimitDown) limitBadge = '<span class="px-1 ml-1 rounded text-[9px] animate-pulse" style="background-color: #00ffff; color: white; text-shadow: 0px 0px 2px rgba(0,0,0,0.8);">跌停</span>';

                    const isWeekend = this.state.date.getDay() === 0 || this.state.date.getDay() === 6;
                    let buyDisabledAttr = isWeekend ? 'disabled title="週末休市中"' : (s.isLimitUp ? 'disabled title="漲停鎖死無法買進"' : '');
                    let sellDisabledAttr = isWeekend ? 'disabled title="週末休市中"' : ((s.owned > 0 && !s.isLimitDown) ? '' : 'disabled title="無庫存或跌停鎖死無法賣出"');

                    const rowHtml = `
                    <tr class="border-b border-green-900 hover:bg-green-900 hover:bg-opacity-20 transition">
                        <td class="py-2">
                            <div class="font-bold text-white flex items-center gap-1 cursor-pointer hover:text-yellow transition" onclick="app.openCompanyInfo(${idx})">
                                <span style="color: ${sectorColor}">■</span>${s.name} <span class="text-[10px] bg-cyan-900 bg-opacity-50 text-cyan px-1 rounded ml-1 border border-cyan-800">ℹ️ 詳情</span>
                            </div>
                            <div class="text-[10px] text-gray-500 tracking-wide">${s.id} | ${sectorName}</div>
                        </td>
                        <td class="py-2 text-right font-bold text-white">$${this.formatMoney(s.price)}</td>
                        <td class="py-2 text-right ${color}"><div class="font-bold flex justify-end items-center">${sign}${this.formatMoney(absChange)}${limitBadge}</div><div class="text-[10px]">(${signMath}${Math.abs(change).toFixed(1)}%)</div></td>
                        <td class="py-2 text-right">${s.owned > 0 ? '$'+this.formatMoney(s.avgCost) : '-'}</td>
                        <td class="py-2 text-right">${s.owned > 0 ? `<div class="text-white">${this.formatMoney(s.owned)}</div>` : '-'}</td>
                        <td class="py-2 text-right ${pnlColor}"><div>${pnlStr}</div>${pnlPctStr}</td>
                        <td class="py-2 text-center space-x-1">
                            <button class="btn-retro px-2 py-1 text-xs border-green-500 text-green-500" onclick="app.openTradeModal(${idx}, 'buy')" ${buyDisabledAttr}>買進</button>
                            <button class="btn-retro px-2 py-1 text-xs border-green-500 text-green-500" onclick="app.openTradeModal(${idx}, 'sell')" ${sellDisabledAttr}>賣出</button>
                        </td>
                    </tr>`;

                    const isTwStock = /^[0-9]+$/.test(s.id) && !foreignNumerics.includes(s.id);
                    if (isTwStock) { htmlTw += rowHtml; if (s.owned > 0) portTw += rowHtml; } 
                    else { htmlGlobal += rowHtml; if (s.owned > 0) portGlobal += rowHtml; }
                });

                if (htmlTw === '') htmlTw = `<tr><td colspan="7" class="py-4 text-center text-gray-500">目前尚無台灣企業掛牌</td></tr>`;
                if (htmlGlobal === '') htmlGlobal = `<tr><td colspan="7" class="py-4 text-center text-gray-500">目前尚無海外企業掛牌</td></tr>`;
                if (portTw === '') portTw = `<tr><td colspan="7" class="py-4 text-center text-gray-500">目前沒有持有任何台灣現股</td></tr>`;
                if (portGlobal === '') portGlobal = `<tr><td colspan="7" class="py-4 text-center text-gray-500">目前沒有持有任何海外現股</td></tr>`;

                document.getElementById('stock-list-tw').innerHTML = htmlTw;
                document.getElementById('stock-list-global').innerHTML = htmlGlobal;
                if(document.getElementById('portfolio-list-tw')) document.getElementById('portfolio-list-tw').innerHTML = portTw;
                if(document.getElementById('portfolio-list-global')) document.getElementById('portfolio-list-global').innerHTML = portGlobal;
            },

            renderMarginMarket() {
                let htmlTw = ''; let htmlGlobal = '';
                const foreignNumerics = ['8035', '6758', '005930', '7974', '0700', '9432', '9984', '7203', '1211'];

                this.state.stocks.forEach((s, idx) => {
                    const sectorDef = DB.sectors[s.sector]; const sectorName = sectorDef ? sectorDef.name : '未知'; const sectorColor = SECTOR_COLORS[s.sector] || '#ffffff';
                    
                    let pnl = 0; let pnlStr = '-'; let pnlColor = 'text-gray-500'; let pnlPctStr = '';
                    let marginRatioStr = '-'; let marginRatioColor = 'text-gray-500';

                    if (s.shortOwned > 0) {
                        pnl = (s.shortAvgPrice - s.price) * s.shortOwned;
                        pnlStr = (pnl >= 0 ? '+' : '') + this.formatMoney(pnl);
                        pnlColor = pnl >= 0 ? 'text-red-retro' : 'text-cyan';
                        const pnlPct = ((s.shortAvgPrice - s.price) / s.shortAvgPrice) * 100;
                        pnlPctStr = `<div class="text-[10px]">(${(pnl >= 0 ? '+' : '') + pnlPct.toFixed(1)}%)</div>`;
                        const ratio = s.shortMargin / (s.shortOwned * s.price);
                        marginRatioStr = (ratio * 100).toFixed(1) + '%';
                        marginRatioColor = ratio < 1.4 ? 'text-red-500 animate-pulse font-bold' : 'text-white';
                    }

                    let limitBadge = '';
                    if (s.isLimitUp) limitBadge = '<span class="px-1 ml-1 rounded text-[9px] animate-pulse" style="background-color: #ff4444; color: white;">漲停</span>';
                    if (s.isLimitDown) limitBadge = '<span class="px-1 ml-1 rounded text-[9px] animate-pulse" style="background-color: #00ffff; color: white; text-shadow: 0px 0px 2px rgba(0,0,0,0.8);">跌停</span>';

                    const isWeekend = this.state.date.getDay() === 0 || this.state.date.getDay() === 6;
                    let shortDisabledAttr = isWeekend ? 'disabled title="週末休市中"' : (s.isLimitDown ? 'disabled title="跌停鎖死無法放空"' : '');
                    let coverDisabledAttr = isWeekend ? 'disabled title="週末休市中"' : ((s.shortOwned > 0 && !s.isLimitUp) ? '' : 'disabled title="無空單或漲停鎖死無法回補"');

                    const rowHtml = `
                    <tr class="border-b border-magenta hover:bg-magenta hover:bg-opacity-10 transition">
                        <td class="py-2">
                            <div class="font-bold text-white flex items-center gap-1 cursor-pointer hover:text-yellow transition" onclick="app.openCompanyInfo(${idx})">
                                <span style="color: ${sectorColor}">■</span>${s.name} <span class="text-[10px] bg-magenta bg-opacity-30 text-magenta border border-magenta px-1 rounded ml-1">ℹ️ 詳情</span>
                            </div>
                            <div class="text-[10px] text-gray-500 tracking-wide">${s.id} | ${sectorName}</div>
                        </td>
                        <td class="py-2 text-right font-bold text-white flex justify-end items-center h-full pt-4">$${this.formatMoney(s.price)}${limitBadge}</td>
                        <td class="py-2 text-right">${s.shortOwned > 0 ? `<div class="text-magenta">${this.formatMoney(s.shortOwned)}</div>` : '-'}</td>
                        <td class="py-2 text-right">${s.shortOwned > 0 ? '$'+this.formatMoney(s.shortAvgPrice) : '-'}</td>
                        <td class="py-2 text-right">${s.shortMargin > 0 ? '$'+this.formatMoney(s.shortMargin) : '-'}</td>
                        <td class="py-2 text-right ${marginRatioColor}">${marginRatioStr}</td>
                        <td class="py-2 text-right ${pnlColor}"><div>${pnlStr}</div>${pnlPctStr}</td>
                        <td class="py-2 text-center space-x-1">
                            <button class="btn-retro px-2 py-1 text-xs border-magenta text-magenta hover:bg-magenta hover:text-white" onclick="app.openTradeModal(${idx}, 'short')" ${shortDisabledAttr}>放空</button>
                            <button class="btn-retro px-2 py-1 text-xs border-yellow text-yellow hover:bg-yellow-800 hover:text-white" onclick="app.openTradeModal(${idx}, 'cover')" ${coverDisabledAttr}>回補</button>
                        </td>
                    </tr>`;

                    const isTwStock = /^[0-9]+$/.test(s.id) && !foreignNumerics.includes(s.id);
                    if (isTwStock) htmlTw += rowHtml; else htmlGlobal += rowHtml;
                });

                if (htmlTw === '') htmlTw = `<tr><td colspan="8" class="py-4 text-center text-gray-500">目前尚無台灣企業掛牌</td></tr>`;
                if (htmlGlobal === '') htmlGlobal = `<tr><td colspan="8" class="py-4 text-center text-gray-500">目前尚無海外企業掛牌</td></tr>`;

                document.getElementById('short-list-tw').innerHTML = htmlTw;
                document.getElementById('short-list-global').innerHTML = htmlGlobal;
            },

            renderBankAndAssets() {
                let bankHtml = '';
                DB.banks.forEach(b => {
                    const acc = this.state.accounts[b.id]; let prodsHtml = '';
                    b.products.forEach(p => { prodsHtml += `<button class="btn-retro text-[10px] px-2 py-1 border-gray-600 mr-1 mt-1" onclick="app.openLoanModal('${b.id}', '${p.id}')">${p.name} (${(p.currentRate*100).toFixed(1)}%)</button>`; });
                    bankHtml += `
                    <div class="bg-black border border-green-800 p-3 mb-2 relative">
                        <div class="flex justify-between items-start mb-2">
                            <div><div class="font-bold text-cyan">${b.name}</div><div class="text-[10px] text-gray-400">${b.desc}</div></div>
                            <div class="text-right"><div class="text-xs text-gray-400">活存利率: ${(b.depositRate*100).toFixed(2)}%</div><div class="text-yellow font-bold">存款: $${this.formatMoney(acc.deposit)}</div></div>
                        </div>
                        <div class="flex gap-2 mb-2">
                            <input type="number" id="b-amt-${b.id}" class="bg-black border border-green-600 px-2 py-1 text-xs w-24 text-white outline-none" placeholder="金額">
                            <button class="btn-retro px-2 py-1 text-xs" onclick="app.bankOp('${b.id}', 'dep')">存款</button>
                            <button class="btn-retro px-2 py-1 text-xs border-yellow text-yellow" onclick="app.bankOp('${b.id}', 'wit')">提款</button>
                            ${b.fdDays > 0 ? `<button class="btn-retro px-2 py-1 text-xs border-cyan text-cyan ml-auto" onclick="app.openFixedDeposit('${b.id}')">${b.fdDays}天定存(${(b.fdRate*100).toFixed(1)}%)</button>` : ''}
                        </div>
                        <div class="grid grid-cols-4 gap-1 mb-2">
                            <button class="btn-retro py-1 text-[10px]" onclick="app.addBankAmt('${b.id}', 10000)">+10000</button>
                            <button class="btn-retro py-1 text-[10px]" onclick="app.addBankAmt('${b.id}', 1000)">+1000</button>
                            <button class="btn-retro py-1 text-[10px]" onclick="app.addBankAmt('${b.id}', 100)">+100</button>
                            <button class="btn-retro py-1 text-[10px] text-yellow border-yellow-800" onclick="app.setBankMaxAmt('${b.id}')">最大</button>
                            <button class="btn-retro py-1 text-[10px] text-gray-400" onclick="app.addBankAmt('${b.id}', -10000)">-10000</button>
                            <button class="btn-retro py-1 text-[10px] text-gray-400" onclick="app.addBankAmt('${b.id}', -1000)">-1000</button>
                            <button class="btn-retro py-1 text-[10px] text-gray-400" onclick="app.addBankAmt('${b.id}', -100)">-100</button>
                            <button class="btn-retro py-1 text-[10px] text-cyan border-cyan-800" onclick="document.getElementById('b-amt-${b.id}').value='';">重置</button>
                        </div>
                        <div class="border-t border-green-900 pt-2"><div class="text-[10px] text-gray-500 mb-1">貸款專案:</div>${prodsHtml}</div>
                    </div>`;
                });
                document.getElementById('bank-list').innerHTML = bankHtml;

                let loansHtml = '';
                if (this.state.activeLoans.length === 0) {
                    loansHtml = '<div class="text-gray-500 text-center py-4">目前無任何債務</div>';
                } else {
                    this.state.activeLoans.forEach(l => {
                        const daysLeft = Math.ceil((l.dueDate.getTime() - this.state.date.getTime()) / (1000 * 3600 * 24));
                        const bankDef = DB.banks.find(x => x.id === l.bankId);
                        loansHtml += `
                        <div class="bg-red-900 bg-opacity-20 border border-red-800 p-2 text-sm relative mb-2">
                            <div class="flex justify-between"><span class="text-red-400 font-bold">${l.name}</span><span class="text-white">$${this.formatMoney(l.principal)}</span></div>
                            <div class="text-[10px] text-gray-400 flex justify-between mt-1"><span>債權人: ${bankDef.name}</span><span>利率: ${(l.currentRate*100).toFixed(1)}%</span></div>
                            <div class="text-[10px] text-gray-400 flex justify-between mt-1"><span>擔保: ${l.collateralName}</span><span class="${daysLeft <= 7 ? 'text-red-500 font-bold animate-pulse' : 'text-yellow'}">剩餘 ${daysLeft} 天</span></div>
                            <div class="mt-2 text-right"><button class="btn-retro px-3 py-1 text-xs border-green-500 text-green-500" onclick="app.repayLoanEarly('${l.id}')">結算本息</button></div>
                        </div>`;
                    });
                }
                document.getElementById('active-loans-list').innerHTML = loansHtml;
            },

            renderShopAndAssets() {
                let reHtml = ''; const hasOwnedRE = this.state.portfolioRE.length > 0;
                DB.realEstate.forEach(r => {
                    const ownedItems = this.state.portfolioRE.filter(x => x.id === r.id);
                    const isCurrentlyRenting = this.state.residence.type === 'rent' && this.state.residence.id === r.id;
                    let luxuryTax = r.price >= 10000000 ? Math.floor(r.price * 0.1) : 0; if (!hasOwnedRE) luxuryTax = 0;
                    
                    let actionBtns = `<div class="grid grid-cols-2 gap-2 mt-2"><button class="btn-retro px-2 py-1 text-xs w-full border-cyan text-cyan" onclick="app.buyAsset('re', '${r.id}')">購入 $${this.formatMoney(r.price)}${luxuryTax > 0 ? `<br><span class="text-[10px] text-red-400 font-bold">+豪華稅 $${this.formatMoney(luxuryTax)}</span>` : ''}</button>`;
                    if (isCurrentlyRenting) actionBtns += `<button class="btn-retro px-2 py-1 text-xs w-full border-red-500 text-red-500" onclick="app.cancelRent()">退租 (搬至街頭)</button>`;
                    else actionBtns += `<button class="btn-retro px-2 py-1 text-xs w-full border-yellow text-yellow" onclick="app.rentProperty('${r.id}')">承租 ($${this.formatMoney(r.rent)}/月)</button>`;
                    actionBtns += `</div>`;

                    let ownedDetails = '';
                    ownedItems.forEach((item, i) => {
                        const isLivingHere = this.state.residence.type === 'own' && this.state.residence.instanceId === item.instanceId;
                        let mStr = item.isMortgaged ? '<span class="text-red-500 ml-2">(已抵押)</span>' : `<button class="btn-retro text-[10px] px-2 py-0.5 border-yellow text-yellow ml-2" onclick="app.sellAsset('re', '${item.instanceId}')">賣出</button>`;
                        let liveBtn = isLivingHere ? `<span class="text-green-400 text-[10px] ml-2">📍居住中</span>` : `<button class="btn-retro text-[10px] px-2 py-0.5 border-cyan text-cyan ml-2" onclick="app.moveIn('${item.instanceId}')">入住</button>`;
                        ownedDetails += `<div class="text-xs text-gray-300 mt-1 flex justify-between items-center border-t border-green-900 pt-1"><span>產權 #${i+1} ${liveBtn}</span> <div>${mStr}</div></div>`;
                    });

                    reHtml += `<div class="bg-black border border-green-800 p-2 mb-2"><div class="flex justify-between"><span class="text-magenta font-bold">${r.name}</span><span class="text-white">$${this.formatMoney(r.price)} <span class="text-[10px] text-gray-500 ml-1">(稅率: ${(r.taxRate*100).toFixed(1)}%)</span></span></div><div class="text-[10px] text-gray-400 flex justify-between mt-1"><span>月租: $${this.formatMoney(r.rent)}</span><span>維護費: ${(r.maint*100).toFixed(0)}%/年</span></div>${ownedDetails}${actionBtns}</div>`;
                });
                const reContainer = document.getElementById('real-estate-list');
                if (reContainer) reContainer.innerHTML = reHtml;

                let luxHtml = ''; 
                let vehHtml = '';
                
                DB.luxury.forEach(l => {
                    const ownedItems = this.state.portfolioLuxury.filter(x => x.id === l.id);
                    const luxuryTax = l.price >= 10000000 ? Math.floor(l.price * 0.1) : 0;
                    
                    let btnHtml = `<button class="btn-retro px-2 py-1 text-xs w-full mt-2 border-yellow text-yellow" onclick="app.buyAsset('luxury', '${l.id}')">購入 $${this.formatMoney(l.price)}${luxuryTax > 0 ? `<br><span class="text-[10px] text-red-400 font-bold">+豪華稅 $${this.formatMoney(luxuryTax)}</span>` : ''}</button>`;
                    
                    let ownedDetails = '';
                    ownedItems.forEach((item, i) => { 
                        let mStr = item.isMortgaged ? '<span class="text-red-500 ml-2">(已抵押)</span>' : '<span class="text-green-500 ml-2">(持有中)</span>'; 
                        ownedDetails += `<div class="text-xs text-gray-300 mt-1 flex justify-between items-center border-t border-green-900 pt-1"><span>收藏 #${i+1}</span> <div>${mStr}</div></div>`; 
                    });

                    const itemHtml = `<div class="bg-black border border-green-800 p-2 mb-2"><div class="flex justify-between"><span class="text-yellow font-bold">${l.name}</span><span class="text-white">$${this.formatMoney(l.price)} <span class="text-[10px] text-gray-500 ml-1">(稅率: ${(l.taxRate*100).toFixed(1)}%)</span></span></div><div class="text-[10px] text-gray-400 flex justify-between mt-1"><span>基礎舒適度: +${l.comfort}</span><span>每月幸福: +${l.hapMonthly}</span></div>${ownedDetails}${btnHtml}</div>`;
                    
                    if (l.category === 'vehicle') {
                        vehHtml += itemHtml; 
                    } else {
                        luxHtml += itemHtml;
                    }
                });

                // 1. 獨立寫入奢華精品專區
                const luxContainer = document.getElementById('luxury-list');
                if (luxContainer) {
                    luxContainer.innerHTML = luxHtml || '<div class="text-gray-500 text-center py-2 text-xs">目前無精品上架</div>';
                }
                
                const vehContainer = document.getElementById('vehicle-list');
                if (vehContainer) {
                    vehContainer.innerHTML = vehHtml || '<div class="text-gray-500 text-center py-2 text-xs">目前無載具上架</div>';
                }
            },

            renderCalendar() {
                const year = this.state.date.getFullYear(); const month = this.state.date.getMonth(); const todayDate = this.state.date.getDate();
                document.getElementById('calendar-header').innerText = `${year}年 ${month + 1}月`;
                const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
                
                let gridHtml = '';
                for(let i=0; i<firstDay; i++) { gridHtml += `<div class="aspect-square border border-green-900 opacity-20"></div>`; }
                for(let d=1; d<=daysInMonth; d++) {
                    const currentStr = this.formatDateStr(new Date(year, month, d)); const isToday = d === todayDate; const dateObj = new Date(year, month, d); const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    let eventsStr = '';
                    // 完美支援 date 為字串或 Date 物件型態的安全過濾比對
                    const dayEvents = this.state.calendarEvents.filter(e => (typeof e.date === 'string' ? e.date : this.formatDateStr(e.date)) === currentStr);
                    if(dayEvents.length > 0) eventsStr = `<div class="absolute bottom-1 right-1 flex gap-0.5">${dayEvents.map(()=>'<div class="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>').join('')}</div>`;
                    const dayRepayments = this.state.activeLoans.filter(l => this.formatDateStr(l.dueDate) === currentStr);
                    if(dayRepayments.length > 0) eventsStr += `<div class="absolute top-1 right-1 flex gap-0.5">${dayRepayments.map(()=>'<div class="w-1.5 h-1.5 bg-red-500"></div>').join('')}</div>`;

                    let classes = 'aspect-square border flex items-center justify-center relative text-sm ';
                    if(isToday) classes += 'border-cyan bg-green-900 bg-opacity-40 text-cyan font-bold '; else if(isWeekend) classes += 'border-red-900 bg-red-900 bg-opacity-20 text-red-500 '; else classes += 'border-green-900 text-gray-300 ';
                    gridHtml += `<div class="${classes}">${d}${eventsStr}</div>`;
                }
                document.getElementById('calendar-grid').innerHTML = gridHtml;

                let pendingHtml = ''; let allUpcoming = [...this.state.calendarEvents];
                this.state.activeLoans.forEach(l => { allUpcoming.push({ date: this.formatDateStr(l.dueDate), type: 'loan_due', msg: `貸款到期: ${l.name}`, amount: -l.principal }); });
                allUpcoming.sort((a,b) => new Date(a.date) - new Date(b.date));

                if(allUpcoming.length === 0) { pendingHtml = '<div class="text-gray-500 text-center py-4">無待處理款項或排程</div>'; } 
                else {
                    allUpcoming.forEach(e => {
                        // 確保 date 安全轉為字串格式供後續 .replace 渲染使用
                        const dateStr = typeof e.date === 'string' ? e.date : this.formatDateStr(e.date);
                        const dispDate = dateStr.replace(/-/g, '/');
                        
                        // 處理數值與訊息相容，防止印出 NaN 或是 undefined
                        const amt = e.amount || 0;
                        const isNeg = amt < 0; const color = isNeg ? 'text-red-500' : 'text-green-400'; const sign = isNeg ? '' : '+';
                        const msg = e.msg || (e.type === 'bug_crisis' ? `公關危機排程: ${e.productName || '半成品'}` : '系統排程事件');
                        
                        pendingHtml += `<div class="border-b border-green-900 pb-1 mb-1"><div class="flex justify-between text-[10px] text-gray-500"><span>${dispDate}</span><span class="${color}">${sign}$${this.formatMoney(Math.abs(amt))}</span></div><div class="text-xs text-gray-300">${msg}</div></div>`;
                    });
                }
                document.getElementById('pending-funds').innerHTML = pendingHtml;
            },

            processCalendarEvents(todayStr) {
                const todayEvents = this.state.calendarEvents.filter(e => e.date === todayStr);
                todayEvents.forEach(e => {
                    this.state.money += e.amount;
                    if (e.type === 'fd_mature') { this.state.yearRevenue += (e.amount - (e.extraData?.principal || 0)); this.log(`【款項入帳】${e.msg}，本利和 $${this.formatMoney(e.amount)} 已匯入。`, 'text-yellow'); } 
                    else if (e.type === 're_sell') { this.log(`【款項入帳】不動產售出尾款 $${this.formatMoney(e.amount)} 已匯入。`, 'text-yellow'); }
                });
                this.state.calendarEvents = this.state.calendarEvents.filter(e => e.date !== todayStr);
            },

            addCalendarEvent(dateObj, type, msg, amount, extraData = {}) {
                this.state.calendarEvents.push({ date: this.formatDateStr(dateObj), type, msg, amount, ...extraData });
                this.state.calendarEvents.sort((a,b) => new Date(a.date) - new Date(b.date));
            },

            recordHistory() {
                let record = { date: this.formatDateStr(this.state.date), index: this.state.marketIndex, stocks: {} };
                this.state.stocks.forEach(s => record.stocks[s.id] = s.price); this.state.history.push(record);
            },

            restartGame() {
                const diff = this.state.selectedDiff; const identity = this.state.selectedIdentity; DB = JSON.parse(ORIGINAL_DB); 
                this.state = { selectedDiff: diff, selectedIdentity: identity, diffParams: null, date: new Date(1988, 0, 1), money: 0, lockedMargin: 0,hospitalizedDays: 0, yearRevenue: 0, yearDeductions: 0, realizedGains: 0, auditRisk: 0, pendingTax: 0, taxDiscount: 0, evadedTaxAmount: 0, insiderPenalty: 0, health: 100, satiety: 80, happiness: 50, stress: 0, comfort: 0, currentMeal: 'normal', residence: { type: 'none', id: null, instanceId: null }, marketIndex: 21500, marketIndexLast: 21500, fundamentalValue: 21500, inflationRate: 0.02, marketState: 'bull', bubbleIndex: 0, baseRate: 0.025, vix: 15.0, scheduledNews: null, cbObservation: { type: null, days: 0, delayTo: 7 }, cbStance: 'neutral', cbActionCooldown: 0, contagionQueue: [], activeRotations: [], priceMultiplier: 1.0, currentBaseDailyCost: 3000, stocks: [], ipoCooldown: 5, accounts: {}, portfolioRE: [], portfolioLuxury: [], calendarEvents: [], activeLoans: [], history: [], chartTarget: 'index', chartPeriod: 30, customChartStocks: [], currentTrade: null, currentBankForFD: null, loanApplyContext: null, isGameOver: false, isProcessingDay: false, currentLiquidationUpdate: null };
                document.getElementById('modal-gameover').classList.add('hidden'); document.getElementById('game-ui').classList.add('hidden'); document.getElementById('start-screen').classList.remove('hidden'); document.getElementById('log-container').innerHTML = '';
                this.selectDifficulty(diff); this.selectIdentity(identity);
            },

            setChartTarget(t) { 
                this.state.chartTarget = t; 
                const container = document.getElementById('custom-chart-selectors');
                if (t === 'custom') { container.classList.remove('hidden'); this.renderCustomStockCheckboxes(); } 
                else { container.classList.add('hidden'); }
                this.renderChart(); 
            },

            setChartPeriod(d) { this.state.chartPeriod = d; this.renderChart(); },

            updateChartSelect() {
                const sel = document.getElementById('chart-target-select'); if(!sel) return;
                let html = '<option value="index">台灣加權指數</option><option value="all_stocks">🌈 所有股票疊合圖</option><option value="tw_stocks">🇹🇼 台灣股票疊合圖</option><option value="global_stocks">🌎 海外股票疊合圖</option><option value="custom">🛠️ 自訂多檔股票比較</option>';
                this.state.stocks.forEach(s => html += `<option value="${s.id}">${s.id} ${s.name}</option>`); sel.innerHTML = html;
                let exists = false; for(let i=0; i<sel.options.length; i++) { if(sel.options[i].value === this.state.chartTarget) exists = true; }
                if(!exists) this.state.chartTarget = 'index'; sel.value = this.state.chartTarget;
            },

            toggleCustomChartStock(id) {
                const idx = this.state.customChartStocks.indexOf(id);
                if (idx > -1) { this.state.customChartStocks.splice(idx, 1); } else { this.state.customChartStocks.push(id); }
                this.renderCustomStockCheckboxes(); this.renderChart();
            },

            renderCustomStockCheckboxes() {
                const container = document.getElementById('custom-chart-selectors'); if (!container) return;
                let html = '<div class="text-[10px] text-gray-400 w-full mb-1">請點擊選擇要比較的股票 (可複選)：</div>';
                this.state.stocks.forEach(s => {
                    const isSelected = this.state.customChartStocks.includes(s.id);
                    const btnClass = isSelected ? 'border-yellow text-yellow bg-yellow-900 bg-opacity-30 shadow-[0_0_5px_#ffff00]' : 'border-green-900 text-gray-500 opacity-60 hover:opacity-100';
                    html += `<button class="btn-retro px-2 py-1 text-xs ${btnClass}" onclick="app.toggleCustomChartStock('${s.id}')">${s.name}</button>`;
                });
                container.innerHTML = html;
            },

            renderChart() {
                const canvas = document.getElementById('price-chart'); if (!canvas) return; 
                const ctx = canvas.getContext('2d'); const width = canvas.width; const height = canvas.height; ctx.clearRect(0, 0, width, height);
                const slice = this.state.history.slice(-this.state.chartPeriod); if (slice.length === 0) return;
                const padL = 70, padR = 20, padT = 30, padB = 30; const drawW = width - padL - padR; const drawH = height - padT - padB;
                
                const isAll = (this.state.chartTarget === 'all_stocks'); const isTwOnly = (this.state.chartTarget === 'tw_stocks'); const isGlobalOnly = (this.state.chartTarget === 'global_stocks'); const isCustom = (this.state.chartTarget === 'custom');
                const isAggregate = isAll || isTwOnly || isGlobalOnly || isCustom;
                
                let seriesList = []; const foreignNumerics = ['8035', '6758', '005930', '7974', '0700', '9432', '9984', '7203', '1211'];
                
                if (isAggregate) { 
                    this.state.stocks.forEach((s, idx) => { 
                        const isTwStock = /^[0-9]+$/.test(s.id) && !foreignNumerics.includes(s.id);
                        if (isTwOnly && !isTwStock) return; if (isGlobalOnly && isTwStock) return; if (isCustom && !this.state.customChartStocks.includes(s.id)) return;
                        seriesList.push({ id: s.id, name: s.name, color: CHART_COLORS[idx % CHART_COLORS.length], data: slice.map(h => h.stocks[s.id] || 0) }); 
                    }); 
                } else {
                    let pts = slice.map(h => this.state.chartTarget === 'index' ? h.index : (h.stocks[this.state.chartTarget] || 0));
                    let c = '#33ff33'; if (this.state.chartTarget !== 'index') { const sIdx = this.state.stocks.findIndex(s => s.id === this.state.chartTarget); if (sIdx > -1) c = CHART_COLORS[sIdx % CHART_COLORS.length]; }
                    seriesList.push({ id: this.state.chartTarget, name: '', color: c, data: pts });
                }
                
                let allVals = []; seriesList.forEach(s => allVals.push(...s.data.filter(v => v > 0)));
                
                if (allVals.length === 0) { 
                    ctx.fillStyle = '#33ff33'; ctx.font = '20px DotGothic16'; ctx.textAlign = 'center'; ctx.fillText('尚無資料 / 未選擇自訂股票', width/2, height/2); document.getElementById('chart-info').innerHTML = ''; return; 
                }
                
                let minVal = Math.min(...allVals); let maxVal = Math.max(...allVals); if (minVal === maxVal) { maxVal *= 1.1; minVal *= 0.9; }
                const range = maxVal - minVal; minVal -= range * 0.1; maxVal += range * 0.1; if (!isAggregate && minVal < 0) minVal = 0; 
                const newRange = maxVal - minVal || 1;
                
                ctx.strokeStyle = '#003300'; ctx.lineWidth = 1; ctx.fillStyle = '#88aa88'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
                for (let i = 0; i <= 5; i++) { let val = minVal + (newRange * (i / 5)); let y = height - padB - (drawH * (i / 5)); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(width - padR, y); ctx.stroke(); ctx.fillText(`$${this.formatMoney(val)}`, padL - 8, y); }
                
                ctx.textAlign = 'center'; ctx.textBaseline = 'top'; const xTicks = Math.min(6, slice.length);
                for (let i = 0; i < xTicks; i++) { let idx = Math.floor(i * (slice.length - 1) / Math.max(1, xTicks - 1)); if(slice.length === 1) idx = 0; let x = padL + (idx / Math.max(1, slice.length - 1)) * drawW; ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, height - padB); ctx.stroke(); ctx.fillText(slice[idx].date.substring(5).replace('-', '/'), x, height - padB + 8); }
                
                const stepX = drawW / Math.max(1, slice.length - 1); ctx.lineJoin = 'round';
                
                seriesList.forEach(s => {
                    ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = isAggregate ? 1.5 : 2;
                    s.data.forEach((val, i) => { if (val === 0) return; let x = padL + i * stepX; let y = height - padB - ((val - minVal) / newRange) * drawH; if (i === 0 || s.data[i-1] === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); 
                    ctx.stroke();
                    if (!isAggregate) { 
                        ctx.lineTo(padL + drawW, height - padB); ctx.lineTo(padL, height - padB); ctx.closePath(); 
                        let rgb = '51, 255, 51'; if (this.state.chartTarget !== 'index') { let hex = s.color.replace('#', ''); rgb = `${parseInt(hex.substring(0, 2), 16)}, ${parseInt(hex.substring(2, 4), 16)}, ${parseInt(hex.substring(4, 6), 16)}`; } 
                        const gradient = ctx.createLinearGradient(0, padT, 0, height - padB); gradient.addColorStop(0, `rgba(${rgb}, 0.3)`); gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = gradient; ctx.fill(); 
                    }
                });

                if (!isAggregate && seriesList[0].data.length > 0) {
                    let pts = seriesList[0].data; let validPts = pts.map((v, i) => ({v, i})).filter(o => o.v > 0);
                    if(validPts.length > 0) {
                        let maxPt = validPts.reduce((p, c) => (p.v > c.v) ? p : c); let minPt = validPts.reduce((p, c) => (p.v < c.v) ? p : c);
                        const drawMarker = (pt, prefix, color, isTop) => { let x = padL + pt.i * stepX; let y = height - padB - ((pt.v - minVal) / newRange) * drawH; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill(); ctx.font = 'bold 12px sans-serif'; ctx.textAlign = (x > padL + drawW/2) ? 'right' : 'left'; ctx.textBaseline = isTop ? 'bottom' : 'top'; ctx.shadowColor = 'black'; ctx.shadowBlur = 4; ctx.fillText(`${prefix}: $${this.formatMoney(pt.v)}`, x + ((x > padL + drawW/2) ? -6 : 6), y + (isTop ? -8 : 8)); ctx.shadowBlur = 0; };
                        drawMarker(maxPt, '最高', '#ffff33', true); if(maxPt.i !== minPt.i || maxPt.v !== minPt.v) drawMarker(minPt, '最低', '#ff5555', false);
                    }
                }

                let targetName = '';
                if (isAll) targetName = '所有股票疊合圖'; else if (isTwOnly) targetName = '台灣股票疊合圖'; else if (isGlobalOnly) targetName = '海外股票疊合圖'; else if (isCustom) targetName = '🛠️ 自訂多檔股票比較'; else if (this.state.chartTarget === 'index') targetName = '台灣加權指數'; else targetName = this.state.stocks.find(s=>s.id===this.state.chartTarget)?.name;
                let infoHtml = '';
                
                if (!isAggregate) {
                    if (seriesList[0].data.length > 0) {
                        const currentVal = seriesList[0].data[seriesList[0].data.length - 1]; const startVal = seriesList[0].data.find(v => v>0) || currentVal; const diffPct = startVal > 0 ? ((currentVal - startVal) / startVal) * 100 : 0; const sign = diffPct >= 0 ? '+' : '';
                        infoHtml = `<span class="text-yellow font-bold">${targetName}</span><br>區間: 近 ${slice.length} 天 <br>變化: <span class="${diffPct>=0?'text-red-retro':'text-cyan'}">${sign}${diffPct.toFixed(2)}%</span>`;
                    }
                } else {
                    infoHtml = `<span class="text-yellow font-bold">${targetName}</span> (近 ${slice.length} 天)<br><div class="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-[10px]">`;
                    seriesList.forEach(s => { infoHtml += `<span style="color:${s.color}">■ ${s.name.split(' ')[0]}</span>`; });
                    infoHtml += `</div>`;
                }
                document.getElementById('chart-info').innerHTML = infoHtml;
            },

            switchTab(tabId, btn) {
                if (this.state.hospitalizedDays > 0 && tabId === 'ceo') {
        this.log("【系統提示】您目前正在住院療養，無法處理公司營運！", "text-red-500 font-bold");
        return;
    }
               document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                if(btn) btn.classList.add('active'); else if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');
                if(document.getElementById(`tab-${tabId}`)) document.getElementById(`tab-${tabId}`).classList.add('active');
                if(tabId === 'calendar') this.renderCalendar();
                if(tabId === 'chart') { this.updateChartSelect(); this.renderChart(); }
                if(tabId === 'ceo') {
                    // [關鍵修正] 自動尋找玩家目前擔任 CEO 或 董事長 的公司索引
                    let targetIdx = CEO_MODULE.currentCompanyIdx;
                    const isValidCurrent = targetIdx !== null && targetIdx !== -1 && this.state.stocks[targetIdx] && 
                        this.state.stocks[targetIdx].playerRole && 
                        (this.state.stocks[targetIdx].playerRole.includes('CEO') || this.state.stocks[targetIdx].playerRole.includes('董事長'));
                        
                    if (!isValidCurrent) {
                        targetIdx = this.state.stocks.findIndex(s => s.playerRole && (s.playerRole.includes('CEO') || s.playerRole.includes('董事長')));
                    }
                    if (targetIdx !== -1) {
                        CEO_MODULE.openDashboard(targetIdx);
                    }
                }
            },
            switchMarketSubTab(subTabId) {
                const spotView = document.getElementById('market-spot-view');
                const marginView = document.getElementById('market-margin-view');
                const btnSpot = document.getElementById('btn-market-spot');
                const btnMargin = document.getElementById('btn-market-margin');

                if (subTabId === 'spot') {
                    spotView.classList.remove('hidden');
                    marginView.classList.add('hidden');
                    btnSpot.className = 'px-4 py-1 text-sm border-b-2 border-green-500 text-green-500 bg-green-900 bg-opacity-20';
                    btnMargin.className = 'px-4 py-1 text-sm border-b-2 border-transparent text-gray-500 hover:text-magenta';
                } else {
                    spotView.classList.add('hidden');
                    marginView.classList.remove('hidden');
                    btnMargin.className = 'px-4 py-1 text-sm border-b-2 border-magenta text-magenta bg-magenta bg-opacity-10';
                    btnSpot.className = 'px-4 py-1 text-sm border-b-2 border-transparent text-gray-500 hover:text-green-500';
                }
            },

           switchFinanceSubTab(subTabId) {
                const regularView = document.getElementById('finance-regular-view');
                const darkView = document.getElementById('finance-dark-view');
                const assetsView = document.getElementById('finance-assets-view');
                const btnRegular = document.getElementById('btn-finance-regular');
                const btnDark = document.getElementById('btn-finance-dark');
                const btnAssets = document.getElementById('btn-finance-assets');

                // 隱藏所有視圖並重置按鈕樣式
                [regularView, darkView, assetsView].forEach(v => v.classList.add('hidden'));
                [btnRegular, btnDark, btnAssets].forEach(b => {
                    b.className = 'px-4 py-1 text-sm border-b-2 border-transparent text-gray-500 hover:text-white';
                });

                if (subTabId === 'regular') {
                    regularView.classList.remove('hidden');
                    btnRegular.className = 'px-4 py-1 text-sm border-b-2 border-green-500 text-green-500 bg-green-900 bg-opacity-20';
                } else if (subTabId === 'dark') {
                    darkView.classList.remove('hidden');
                    btnDark.className = 'px-4 py-1 text-sm border-b-2 border-red-500 text-red-500 bg-red-900 bg-opacity-20';
                } else if (subTabId === 'assets') {
                    assetsView.classList.remove('hidden');
                    btnAssets.className = 'px-4 py-1 text-sm border-b-2 border-yellow text-yellow bg-yellow-900 bg-opacity-10';
                }
            },

            log(msg, colorClass = 'text-green-400') {
                const logDiv = document.getElementById('log-container');
                logDiv.insertAdjacentHTML('afterbegin', `<div class="border-b border-green-900 pb-1 ${colorClass}"><span class="opacity-60 text-gray-500">[${String(this.state.date.getMonth()+1).padStart(2,'0')}/${String(this.state.date.getDate()).padStart(2,'0')}]</span> ${msg}</div>`);
                if(logDiv.children.length > 50) logDiv.lastChild.remove();
            },

            // --- [新增] 玩家親自接任 CEO 執行邏輯 ---
            takeOverCEO(idx) {
                const s = this.state.stocks[idx];
                if (!s) return;
                const oldCeoName = s.currentCEO ? s.currentCEO.name : '原執行長';
                
                s.playerRole = 'CEO';
                // 抓取您設定的玩家名稱
                const playerName = document.getElementById('ui-player-name')?.textContent || "大亨 (您)";
                
                // 將公司的 currentCEO 完美替換為玩家兼任的專屬檔案
                s.currentCEO = {
                    id: 'PLAYER_CEO',
                    name: playerName + ' (兼任)',
                    age: 38,
                    salary: 0, // 董事長兼任不領取固定底薪
                    stats: { leadership: 95, rd: 95, finance: 95, marketing: 95, operations: 95 }, // 具備頂級的全能屬性
                    traits: [],
                    isPlayer: true
                };
                
                this.log(`【人事命令】您決定親自掌舵！正式解任 ${oldCeoName}，由您親自接任 ${s.name} 的 CEO 職位！`, 'text-yellow font-bold animate-pulse');
                this.updateUI();
                this.openCompanyInfo(idx); // 立即刷新當前公司彈窗畫面
            },

            
            // --- [新增] 僅解雇現任 CEO (保留空缺) ---
            fireCurrentCEO(idx) {
                const s = this.state.stocks[idx];
                if (!s || !s.currentCEO) return;
                
                const oldName = s.currentCEO.name;
                s.currentCEO = null;
                s.playerRole = s.foundDate ? '董事長 (創辦人)' : '董事長';
                
                // 解雇最高主管通常引發短期市場賣壓震盪
                s.spillover -= 0.1;
                
                this.log(`【人事地震】董事長大刀闊斧！${s.name} 正式解雇現任執行長 ${oldName}，目前執行長職位暫時空缺。`, "text-red-500 font-bold animate-pulse");
                this.updateUI();
                this.openCompanyInfo(idx);
            },

            // --- [新增] 觸發獵人頭公司尋找 3 位 CEO 候選人 ---
            triggerHeadhunter(idx, cost) {
                const s = this.state.stocks[idx];
                if (!s) return;
                
                // 1. 改為檢查「公司帳上營運資金」是否足夠支付
                if ((s.corporateCash || 0) < cost) {
                    this.log(`【獵頭委託失敗】公司帳上營運資金不足以支付獵人頭顧問費！(需 $${this.formatMoney(cost)})`, "text-red-500 font-bold");
                    return;
                }
                
                // 2. 從公司帳戶扣除公款，並認列為公司當月支出
                s.corporateCash -= cost;
                s.monthExpense = (s.monthExpense || 0) + cost;
                
                // 3. 即時更新營運面板頂部的公司現金 UI 顯示
                const cashEl = document.getElementById('ceo-company-cash');
                if (cashEl) cashEl.innerText = `$ ${this.formatMoney(s.corporateCash)}`;
                
                // 確保全域人才庫存在且充沛
                if (typeof CEOMarket !== 'undefined') {
                    // 如果待業人選不足 3 人，自動補充生成
                    if (!CEOMarket.candidates) CEOMarket.candidates = [];
                    if (CEOMarket.candidates.length < 3) {
                        CEOMarket.generateCandidates(10);
                    }
                    
                    // 為了給玩家極佳體驗，隨機洗牌抽出 3 位，確保每次委託都有不同選擇
                    let pool = [...CEOMarket.candidates];
                    pool.sort(() => Math.random() - 0.5);
                    
                    // 存入該公司專屬的暫存獵頭推薦名單
                    s.headhunterCandidates = pool.slice(0, 3);
                    
                    this.log(`【獵頭委託】支付服務費 $${this.formatMoney(cost)}，獵人頭公司迅速為 ${s.name} 遞交了 3 位優秀的專業執行長名單！`, "text-cyan font-bold");
                    this.updateUI();
                    this.openCompanyInfo(idx); // 立即重繪展開推薦卡片
                }
            },

            // --- [新增] 正式從獵頭名單中聘用新任 CEO ---
            hireHeadhunterCEO(idx, candidateId) {
                const s = this.state.stocks[idx];
                if (!s || !s.headhunterCandidates) return;
                
                const candidateObj = s.headhunterCandidates.find(c => c.id === candidateId);
                if (!candidateObj) return;
                
                const oldCeoName = s.currentCEO ? s.currentCEO.name : '';
                
                // 正式走馬上任
                s.currentCEO = candidateObj;
                
                // 不管原本是玩家親自兼任還是留職空缺，一律更新為董事長身分讓新 CEO 替您打工
                s.playerRole = s.foundDate ? '董事長 (創辦人)' : '董事長';
                
                // 從 CEOMarket 全域待業庫中真正除名被錄取的人
                if (typeof CEOMarket !== 'undefined' && CEOMarket.candidates) {
                    CEOMarket.candidates = CEOMarket.candidates.filter(c => c.id !== candidateId);
                    CEOMarket.activeCEOs[s.id] = candidateObj;
                }
                
                // 聘用完成，清空該公司的推薦暫存
                s.headhunterCandidates = null;
                
                let logMsg = `【人事發布】經由獵頭推薦，${s.name} 董事會正式委任 ${candidateObj.name} 出任新任執行長 (CEO)！`;
                if (oldCeoName) {
                    logMsg += oldCeoName.includes('兼任') ? `您順利卸下兼任重擔，由專業經理人接手。` : `原執行長 ${oldCeoName} 依法解任。`;
                }
                
                this.log(logMsg, "text-yellow font-bold animate-pulse");
                this.updateUI();
                this.openCompanyInfo(idx);
            },

            // --- [新增] 取消/隱藏獵頭名單 ---
            cancelHeadhunter(idx) {
                const s = this.state.stocks[idx];
                if (!s) return;
                s.headhunterCandidates = null;
                this.openCompanyInfo(idx);
            },
            
            closeModal(id) {
                document.getElementById(`modal-${id}`).classList.add('hidden');
                if(id === 'trade') this.state.currentTrade = null;
                if(id === 'fixed-dep') this.state.currentBankForFD = null;
            },
            switchCompanyTab(tabId) {
                // 1. 將 'ceo' 納入巡檢陣列中
                const tabs = ['info', 'chart', 'ceo', 'board'];
                tabs.forEach(t => {
                    const content = document.getElementById(`ci-tab-${t}`);
                    const btn = document.getElementById(`btn-ci-tab-${t}`);
                    if (content) content.classList.add('hidden');
                    // 同時清除常規的綠色選取狀態，以及 CEO 專屬的黃色選取狀態
                    if (btn) btn.classList.remove('bg-green-900', 'bg-opacity-50', 'bg-yellow-900', 'bg-opacity-50');
                });
                
                const activeContent = document.getElementById(`ci-tab-${tabId}`);
                const activeBtn = document.getElementById(`btn-ci-tab-${tabId}`);
                if (activeContent) activeContent.classList.remove('hidden');
                if (activeBtn) {
                    // 2. 判斷如果是 CEO 頁籤，給予專屬的黃色系背景，其餘維持終端機綠色
                    const activeClass = (tabId === 'ceo') ? 'bg-yellow-900' : 'bg-green-900';
                    activeBtn.classList.add(activeClass, 'bg-opacity-50');
                }
            }
        };

        window.onload = () => {
            ORIGINAL_DB = JSON.stringify(DB); 
            app.selectDifficulty('normal');
            app.populateInitialHousing();
            
            // 僅初始化 CEO 人才市場庫 (生成 150 人)
            if (typeof CEOMarket !== 'undefined') {
                CEOMarket.init();
                console.log("CEO 人才市場 150 位候選人已完成掃描，等待公司上市招聘。");
            }
        };

