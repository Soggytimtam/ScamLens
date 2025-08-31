// ScamLens Pro - Beautiful Banner with Text Highlighting
let RULES = [];
let SCAMWATCH_ALERTS = [];
let detectedPatterns = new Map(); // Store pattern locations for highlighting
let currentHits = []; // Store current detected patterns for highlighting
let whitelistedDomains = new Set(); // Store whitelisted domains
let whitelistedPatterns = new Set(); // Store whitelisted patterns

// Load rules and alerts
async function loadRules() {
  try {
    console.log('📚 Loading rules...');
    
    // Load ACCC rules
    const acccResponse = await fetch(chrome.runtime.getURL('rules/accc_rules.json'));
    RULES = await acccResponse.json();
    console.log(`✅ Loaded ${RULES.length} ACCC rules`);
    
    // Load Scamwatch alerts
    const alertsResponse = await fetch(chrome.runtime.getURL('rules/scamwatch_alerts.json'));
    SCAMWATCH_ALERTS = await alertsResponse.json();
    console.log(`✅ Loaded ${SCAMWATCH_ALERTS.alerts?.length || 0} Scamwatch alerts`);
    
  } catch (error) {
    console.error('❌ Failed to load rules:', error);
    RULES = [];
    SCAMWATCH_ALERTS = [];
  }
}

// Get visible text from page
function getVisibleText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let text = '', node;
  while (node = walker.nextNode()) {
    const content = node.nodeValue.trim();
    if (content) text += ' ' + content;
  }
  return text.toLowerCase();
}

// Find and store pattern locations in the page
function findPatternLocations(text, hits) {
  detectedPatterns.clear();
  
  hits.forEach(hit => {
    const locations = [];
    
    // Find all text nodes that contain the pattern
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    
    while (node = walker.nextNode()) {
      const nodeText = node.textContent.toLowerCase();
      try {
        const regex = new RegExp(hit.pattern, 'i');
        if (regex.test(nodeText)) {
          // Find the best parent element to highlight
          let parent = node.parentElement;
          while (parent && parent !== document.body) {
            if (parent.tagName && ['P', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'A'].includes(parent.tagName)) {
              locations.push({
                element: parent,
                text: node.textContent,
                pattern: hit.pattern,
                matchedText: nodeText.match(regex)[0]
              });
              break;
            }
            parent = parent.parentElement;
          }
        }
      } catch (error) {
        console.warn('⚠️ Error finding pattern location:', error);
      }
    }
    
    detectedPatterns.set(hit.id, locations);
  });
  
  console.log(`📍 Found locations for ${hits.length} patterns`);
}

// Highlight detected patterns on the page with descriptive information
function highlightPatterns() {
  detectedPatterns.forEach((locations, patternId) => {
    locations.forEach(location => {
      const element = location.element;
      
      // Find the pattern details for this hit
      const patternDetails = currentHits.find(hit => hit.id === patternId);
      
      // Add highlight styling
      element.style.outline = '3px solid #ff6b6b';
      element.style.outlineOffset = '2px';
      element.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
      element.style.borderRadius = '4px';
      element.style.transition = 'all 0.3s ease';
      
      // Add descriptive highlight indicator with whitelist button
      const indicator = document.createElement('div');
      indicator.className = 'scamlens-highlight-indicator';
      indicator.style.cssText = `
        position: absolute;
        top: -40px;
        left: 0;
        z-index: 10001;
        background: #ff6b6b;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: bold;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        opacity: 0;
        transition: opacity 0.3s ease;
        max-width: 350px;
        line-height: 1.3;
        pointer-events: auto;
      `;
      
      // Make indicator more descriptive with logic explanation and whitelist button
      if (patternDetails) {
        const logicExplanation = getLogicExplanation(patternDetails);
        indicator.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 2px;">🚨 ${patternDetails.severity.toUpperCase()} RISK</div>
          <div style="font-size: 10px; opacity: 0.9; margin-bottom: 3px;">${patternDetails.why}</div>
          <div style="font-size: 9px; opacity: 0.8; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 3px; margin-bottom: 6px;">
            ${logicExplanation}
          </div>
          <button class="scamlens-whitelist-pattern" style="
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.4);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 9px;
            font-weight: bold;
            transition: all 0.2s ease;
            width: 100%;
            margin-top: 2px;
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
            ✅ Whitelist This Pattern
          </button>
        `;
        
        // Add event listener for the whitelist button
        const whitelistBtn = indicator.querySelector('.scamlens-whitelist-pattern');
        whitelistBtn.onclick = () => {
          whitelistCurrentPattern(patternId, patternDetails);
        };
      } else {
        indicator.innerHTML = `
          <div>🚨 Scam Pattern Detected</div>
          <button class="scamlens-whitelist-pattern" style="
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.4);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 9px;
            font-weight: bold;
            transition: all 0.2s ease;
            width: 100%;
            margin-top: 6px;
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
            ✅ Whitelist This Pattern
          </button>
        `;
        
        // Add event listener for the whitelist button
        const whitelistBtn = indicator.querySelector('.scamlens-whitelist-pattern');
        whitelistBtn.onclick = () => {
          whitelistCurrentPattern(patternId, { id: patternId, why: 'Unknown pattern' });
        };
      }
      
      // Position the indicator
      const rect = element.getBoundingClientRect();
      indicator.style.left = rect.left + 'px';
      indicator.style.top = (rect.top - 45) + 'px';
      
      document.body.appendChild(indicator);
      
      // Store reference for removal
      element.scamlensIndicator = indicator;
      
      // Show indicator on hover
      element.addEventListener('mouseenter', () => {
        indicator.style.opacity = '1';
      });
      
      element.addEventListener('mouseleave', () => {
        indicator.style.opacity = '0';
      });
    });
  });
}

// Remove all highlights with cleanup
function removeHighlights() {
  detectedPatterns.forEach((locations) => {
    locations.forEach(location => {
      const element = location.element;
      element.style.outline = '';
      element.style.outlineOffset = '';
      element.style.backgroundColor = '';
      element.style.borderRadius = '';
      
      if (element.scamlensIndicator) {
        element.scamlensIndicator.remove();
        element.scamlensIndicator = null;
      }
    });
  });
  detectedPatterns.clear();
  
  // Clean up any orphaned indicators
  const orphanedIndicators = document.querySelectorAll('.scamlens-highlight-indicator');
  orphanedIndicators.forEach(indicator => indicator.remove());
  
  console.log('🧹 Cleaned up all highlights');
}

// Auto-cleanup highlights after a delay
function scheduleHighlightCleanup() {
  setTimeout(() => {
    if (detectedPatterns.size > 0) {
      console.log('🕐 Auto-cleaning highlights after timeout');
      removeHighlights();
    }
  }, 300000); // 5 minutes
}

// Load whitelisted domains and patterns from storage
async function loadWhitelist() {
  try {
    // Check if chrome.storage is available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const [domainResult, patternResult] = await Promise.all([
        chrome.storage.local.get(['whitelist']),
        chrome.storage.local.get(['patternWhitelist'])
      ]);
      whitelistedDomains = new Set(domainResult.whitelist || []);
      whitelistedPatterns = new Set(patternResult.patternWhitelist || []);
      console.log(`✅ Loaded ${whitelistedDomains.size} whitelisted domains and ${whitelistedPatterns.size} whitelisted patterns`);
    } else {
      console.warn('⚠️ Chrome storage not available - using local storage');
      // Fallback to localStorage for testing
      const localWhitelist = localStorage.getItem('scamlens_whitelist');
      const localPatternWhitelist = localStorage.getItem('scamlens_pattern_whitelist');
      if (localWhitelist) {
        whitelistedDomains = new Set(JSON.parse(localWhitelist));
      }
      if (localPatternWhitelist) {
        whitelistedPatterns = new Set(JSON.parse(localPatternWhitelist));
      }
      console.log(`✅ Loaded ${whitelistedDomains.size} domains and ${whitelistedPatterns.size} patterns from localStorage`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to load whitelist:', error);
  }
}

// Add current domain to whitelist
async function whitelistCurrentDomain() {
  try {
    const domain = window.location.hostname;
    whitelistedDomains.add(domain);
    
    // Save to storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ 
        whitelist: Array.from(whitelistedDomains) 
      });
      console.log(`✅ Saved to Chrome storage: ${domain}`);
    } else {
      // Fallback to localStorage
      localStorage.setItem('scamlens_whitelist', JSON.stringify(Array.from(whitelistedDomains)));
      console.log(`✅ Saved to localStorage: ${domain}`);
    }
    
    console.log(`✅ Whitelisted domain: ${domain}`);
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10002;
      background: #4caf50; color: white; padding: 15px; border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    successMsg.innerHTML = `✅ ${domain} added to whitelist`;
    document.body.appendChild(successMsg);
    
    // Remove after 3 seconds
    setTimeout(() => successMsg.remove(), 3000);
    
    // Close banner
    const banner = document.getElementById('scamlens-banner');
    if (banner) {
      removeHighlights();
      banner.remove();
      document.body.style.paddingTop = '';
    }
    
  } catch (error) {
    console.error('❌ Failed to whitelist domain:', error);
  }
}

// Get logic explanation for detected pattern
function getLogicExplanation(pattern) {
  const explanations = {
    'urgency_threat': 'Pattern matched: urgency words like "urgent", "24 hours", "final warning"',
    'unusual_payment': 'Pattern matched: suspicious payment methods like "gift cards", "Bitcoin", "Western Union"',
    'remote_access': 'Pattern matched: remote access tools like "AnyDesk", "TeamViewer"',
    'bank_details_change': 'Pattern matched: bank detail change requests like "bank details have changed", "new BSB"',
    'login_steal': 'Pattern matched: credential requests like "verify account", "re-enter password"',
    'delivery_scam': 'Pattern matched: delivery issues like "undelivered package", "customs fee"',
    'investment_too_good': 'Pattern matched: unrealistic promises like "guaranteed returns", "get rich quick"',
    'tax_bait': 'Pattern matched: tax-related lures like "myGov", "ATO refund"',
    'support_impersonation': 'Pattern matched: brand impersonation like "Microsoft support", "Apple security"',
    'payment_redirect': 'Pattern matched: payment instruction changes like "pay to new account", "ignore previous"',
    'giveaway_prize': 'Pattern matched: prize scams like "congratulations", "randomly selected"',
    'romance_money': 'Pattern matched: romance scam escalation like "urgent help with money", "medical emergency"'
  };
  
  return explanations[pattern.id] || 'Pattern matched against known scam indicators';
}

// Get recommended next steps based on detected patterns and risk level
function getRecommendedNextSteps(hits, riskLevel) {
  const steps = [];
  const patternTypes = hits.map(hit => hit.id);
  
  // High-priority immediate actions
  if (riskLevel === 'red') {
    steps.push({
      priority: 'immediate',
      icon: '🚨',
      title: 'STOP - Do Not Proceed',
      description: 'Do not enter any personal information, passwords, or payment details on this page.',
      action: 'Close this page immediately'
    });
    
    steps.push({
      priority: 'immediate',
      icon: '🔒',
      title: 'Secure Your Accounts',
      description: 'If you\'ve already entered information, change your passwords immediately.',
      action: 'Change passwords now'
    });
  }
  
  // Pattern-specific recommendations
  if (patternTypes.some(p => ['unusual_payment', 'payment_redirect'].includes(p))) {
    steps.push({
      priority: 'high',
      icon: '💳',
      title: 'Verify Payment Instructions',
      description: 'Contact the organization directly using official contact details to confirm any payment changes.',
      action: 'Call official number'
    });
  }
  
  if (patternTypes.some(p => ['login_steal', 'bank_details_change'].includes(p))) {
    steps.push({
      priority: 'high',
      icon: '🏦',
      title: 'Contact Your Bank',
      description: 'If this relates to banking, contact your bank directly to verify any requests.',
      action: 'Call your bank'
    });
  }
  
  if (patternTypes.some(p => ['remote_access', 'support_impersonation'].includes(p))) {
    steps.push({
      priority: 'high',
      icon: '💻',
      title: 'Never Allow Remote Access',
      description: 'Legitimate support will never ask for remote access to your computer.',
      action: 'Hang up/close page'
    });
  }
  
  if (patternTypes.some(p => ['tax_bait'].includes(p))) {
    steps.push({
      priority: 'medium',
      icon: '🏛️',
      title: 'Check Official Government Sites',
      description: 'Visit myGov.au or ATO.gov.au directly to check for legitimate communications.',
      action: 'Visit official sites'
    });
  }
  
  if (patternTypes.some(p => ['investment_too_good', 'giveaway_prize'].includes(p))) {
    steps.push({
      priority: 'medium',
      icon: '🎯',
      title: 'Research Before Investing',
      description: 'Check ASIC\'s MoneySmart website for investment warnings and scam alerts.',
      action: 'Visit MoneySmart.gov.au'
    });
  }
  
  // General recommendations
  steps.push({
    priority: 'medium',
    icon: '📝',
    title: 'Report This Scam',
    description: 'Help protect others by reporting this scam to Scamwatch.',
    action: 'Report to Scamwatch'
  });
  
  if (riskLevel !== 'red') {
    steps.push({
      priority: 'low',
      icon: '🔍',
      title: 'Stay Vigilant',
      description: 'Be cautious of any requests for personal information or urgent actions.',
      action: 'Verify independently'
    });
  }
  
  // Sort by priority and return top 4-5 most relevant steps
  const priorityOrder = { 'immediate': 0, 'high': 1, 'medium': 2, 'low': 3 };
  return steps
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);
}

// Enhanced whitelist function with better feedback
async function whitelistCurrentPattern(patternId, patternDetails) {
  try {
    const domain = window.location.hostname;
    const patternKey = `${domain}_${patternId}`;
    
    // Show immediate feedback
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10002;
      background: #4caf50; color: white; padding: 15px; border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    successMsg.innerHTML = `⏳ Whitelisting pattern...`;
    document.body.appendChild(successMsg);
    
    // Load existing pattern whitelist
    let patternWhitelist = new Set();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const { patternWhitelist: stored = [] } = await chrome.storage.local.get(['patternWhitelist']);
      patternWhitelist = new Set(stored);
    } else {
      const localPatternWhitelist = localStorage.getItem('scamlens_pattern_whitelist');
      if (localPatternWhitelist) {
        patternWhitelist = new Set(JSON.parse(localPatternWhitelist));
      }
    }
    
    // Add this pattern to whitelist
    patternWhitelist.add(patternKey);
    
    // Save to storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ 
        patternWhitelist: Array.from(patternWhitelist) 
      });
      console.log(`✅ Saved pattern to Chrome storage: ${patternKey}`);
    } else {
      localStorage.setItem('scamlens_pattern_whitelist', JSON.stringify(Array.from(patternWhitelist)));
      console.log(`✅ Saved pattern to localStorage: ${patternKey}`);
    }
    
    console.log(`✅ Whitelisted pattern: ${patternId} on ${domain}`);
    
    // Update success message
    successMsg.innerHTML = `✅ Pattern "${patternDetails.why}" whitelisted on ${domain}`;
    successMsg.style.background = '#4caf50';
    
    // Remove after 3 seconds
    setTimeout(() => {
      successMsg.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => successMsg.remove(), 300);
    }, 3000);
    
    // Remove this specific highlight
    const locations = detectedPatterns.get(patternId);
    if (locations) {
      locations.forEach(location => {
        const element = location.element;
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.backgroundColor = '';
        element.style.borderRadius = '';
        
        if (element.scamlensIndicator) {
          element.scamlensIndicator.remove();
          element.scamlensIndicator = null;
        }
      });
      detectedPatterns.delete(patternId);
    }
    
    // Update current hits to remove whitelisted pattern
    currentHits = currentHits.filter(hit => hit.id !== patternId);
    
    // If no more patterns, close banner
    if (currentHits.length === 0) {
      const banner = document.getElementById('scamlens-banner');
      if (banner) {
        removeHighlights();
        banner.remove();
        document.body.style.paddingTop = '';
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to whitelist pattern:', error);
    
    // Show error message
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10002;
      background: #f44336; color: white; padding: 15px; border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    errorMsg.innerHTML = `❌ Failed to whitelist pattern. Please try again.`;
    document.body.appendChild(errorMsg);
    
    setTimeout(() => errorMsg.remove(), 5000);
  }
}

// Scan text against rules
function scanText(text) {
  const hits = [];
  const currentDomain = window.location.hostname;
  
  // Scan ACCC rules
  for (const rule of RULES) {
    try {
      if (rule.pattern && rule.why) {
        // Check if this pattern is whitelisted for this domain
        const patternKey = `${currentDomain}_${rule.id}`;
        if (whitelistedPatterns.has(patternKey)) {
          console.log(`⏭️ Skipping whitelisted pattern: ${rule.id}`);
          continue;
        }
        
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(text)) {
          hits.push({
            id: rule.id,
            pattern: rule.pattern,
            severity: rule.severity || 'med',
            why: rule.why,
            source: 'ACCC',
            learnMore: rule.learn_more
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Invalid regex pattern:', rule.pattern, error);
    }
  }
  
  // Scan Scamwatch alerts
  if (SCAMWATCH_ALERTS.alerts) {
    for (const alert of SCAMWATCH_ALERTS.alerts) {
      try {
        if (alert.pattern && alert.why) {
          // Check if this pattern is whitelisted for this domain
          const patternKey = `${currentDomain}_${alert.id}`;
          if (whitelistedPatterns.has(patternKey)) {
            console.log(`⏭️ Skipping whitelisted pattern: ${alert.id}`);
            continue;
          }
          
          const regex = new RegExp(alert.pattern, 'i');
          if (regex.test(text)) {
            hits.push({
              id: alert.id,
              pattern: alert.pattern,
              severity: alert.severity || 'med',
              why: alert.why,
              source: 'Scamwatch',
              learnMore: alert.learn_more
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ Invalid regex pattern in alert:', alert.pattern, error);
      }
    }
  }
  
  console.log(`🔍 Found ${hits.length} scam patterns (after filtering whitelisted)`);
  return hits;
}

// Show beautiful banner
function showBanner(hits) {
  if (document.getElementById('scamlens-banner')) return;
  
  // Store current hits for highlighting
  currentHits = hits;
  
  // Find pattern locations first
  findPatternLocations(getVisibleText(), hits);
  
  // Determine risk level
  let riskLevel = 'green';
  if (hits.some(h => h.severity === 'high')) {
    riskLevel = 'red';
  } else if (hits.length > 0) {
    riskLevel = 'amber';
  }
  
  // Create banner
  const banner = document.createElement('div');
  banner.id = 'scamlens-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10000;
    background: linear-gradient(135deg, ${riskLevel === 'red' ? '#ff4757' : riskLevel === 'amber' ? '#ffa502' : '#2ed573'}, ${riskLevel === 'red' ? '#ff3742' : riskLevel === 'amber' ? '#ff9f43' : '#1e90ff'});
    color: white;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
  `;
  
  // Banner content
  const icon = riskLevel === 'red' ? '🚨' : riskLevel === 'amber' ? '⚠️' : '✅';
  const title = riskLevel === 'red' ? 'High-Risk Scam Detected' : 
                riskLevel === 'amber' ? 'Possible Scam Detected' : 
                'No Scam Signals';
  
  banner.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
        <div style="flex: 1;">
          <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
            ${icon} ${title}
          </h2>
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 15px;">
            Found <strong>${hits.length}</strong> suspicious pattern${hits.length !== 1 ? 's' : ''} on this page
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button id="scamlens-highlight" style="
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            font-size: 13px;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
            🔍 Highlight Patterns
          </button>
          <button id="scamlens-whitelist" style="
            background: rgba(255,255,255,0.15);
            color: white;
            border: 1px solid rgba(255,255,255,0.25);
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            font-size: 13px;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          " onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
            ✅ Whitelist Site
          </button>
          <button id="scamlens-report" style="
            background: white;
            color: ${riskLevel === 'red' ? '#ff4757' : riskLevel === 'amber' ? '#ffa502' : '#2ed573'};
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            📝 Report to Scamwatch
          </button>
          <button id="scamlens-close" style="
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
          " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
            ✕
          </button>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Detected Patterns Section -->
        <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; backdrop-filter: blur(10px);">
          <div style="font-size: 13px; font-weight: 500; margin-bottom: 10px; opacity: 0.9;">
            🔍 Detected Patterns:
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${hits.map(hit => `
              <div style="
                background: rgba(255,255,255,0.1);
                border-radius: 6px;
                padding: 10px;
                border-left: 4px solid ${hit.severity === 'high' ? '#ff6b6b' : '#ffa502'};
              ">
                <div style="font-weight: 600; margin-bottom: 4px; font-size: 11px;">
                  [${hit.source}] ${hit.severity.toUpperCase()} RISK
                </div>
                <div style="font-size: 11px; opacity: 0.9; line-height: 1.3;">
                  ${hit.why}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Recommended Next Steps Section -->
        <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; backdrop-filter: blur(10px);">
          <div style="font-size: 13px; font-weight: 500; margin-bottom: 10px; opacity: 0.9;">
            🛡️ Recommended Next Steps:
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${getRecommendedNextSteps(hits, riskLevel).map(step => `
              <div style="
                background: rgba(255,255,255,0.1);
                border-radius: 6px;
                padding: 10px;
                border-left: 4px solid ${step.priority === 'immediate' ? '#ff4757' : step.priority === 'high' ? '#ff6b6b' : step.priority === 'medium' ? '#ffa502' : '#2ed573'};
              ">
                <div style="font-weight: 600; margin-bottom: 4px; font-size: 11px; display: flex; align-items: center; gap: 6px;">
                  ${step.icon} ${step.title}
                </div>
                <div style="font-size: 10px; opacity: 0.9; line-height: 1.3; margin-bottom: 4px;">
                  ${step.description}
                </div>
                <div style="font-size: 10px; opacity: 0.8; font-style: italic; color: rgba(255,255,255,0.8);">
                  → ${step.action}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add banner to page
  document.body.prepend(banner);
  document.body.style.paddingTop = '180px';
  
  // Event listeners
  document.getElementById('scamlens-close').onclick = () => {
    removeHighlights();
    banner.remove();
    document.body.style.paddingTop = '';
  };
  
  document.getElementById('scamlens-highlight').onclick = () => {
    highlightPatterns();
    // Change button text
    const btn = document.getElementById('scamlens-highlight');
    btn.textContent = '✅ Patterns Highlighted';
    btn.style.background = 'rgba(255,255,255,0.3)';
    btn.disabled = true;
  };
  
  document.getElementById('scamlens-whitelist').onclick = () => {
    whitelistCurrentDomain();
  };
  
  document.getElementById('scamlens-report').onclick = () => {
    try {
      chrome.tabs.create({ 
        url: 'https://portal.scamwatch.gov.au/report-a-scam/' 
      });
    } catch (error) {
      window.open('https://portal.scamwatch.gov.au/report-a-scam/', '_blank');
    }
  };
  
  // Add click handlers for next step actions
  addNextStepInteractions(getRecommendedNextSteps(hits, riskLevel), hits.length);
  
  console.log('✅ Beautiful banner displayed');
}

// Add interactive functionality to next step recommendations
function addNextStepInteractions(nextSteps, patternCount) {
  // Add click handlers for next steps in the right column
  setTimeout(() => {
    const nextStepElements = document.querySelectorAll('div[style*="🛡️ Recommended Next Steps:"]')[0]?.parentElement?.querySelectorAll('div[style*="border-left: 4px solid"]');
    
    if (nextStepElements) {
      nextStepElements.forEach((stepElement, index) => {
        if (index < nextSteps.length) {
          const step = nextSteps[index];
          stepElement.style.cursor = 'pointer';
          stepElement.style.transition = 'all 0.2s ease';
          
          stepElement.onmouseover = () => {
            stepElement.style.background = 'rgba(255,255,255,0.2)';
            stepElement.style.transform = 'translateX(4px)';
          };
          
          stepElement.onmouseout = () => {
            stepElement.style.background = 'rgba(255,255,255,0.1)';
            stepElement.style.transform = 'translateX(0)';
          };
          
          stepElement.onclick = () => {
            handleNextStepAction(step);
          };
        }
      });
    }
  }, 100); // Small delay to ensure DOM is ready
}

// Handle next step action clicks
function handleNextStepAction(step) {
  const actions = {
    'Report to Scamwatch': () => {
      try {
        chrome.tabs.create({ url: 'https://portal.scamwatch.gov.au/report-a-scam/' });
      } catch (error) {
        window.open('https://portal.scamwatch.gov.au/report-a-scam/', '_blank');
      }
    },
    'Visit official sites': () => {
      try {
        chrome.tabs.create({ url: 'https://my.gov.au/' });
      } catch (error) {
        window.open('https://my.gov.au/', '_blank');
      }
    },
    'Visit MoneySmart.gov.au': () => {
      try {
        chrome.tabs.create({ url: 'https://moneysmart.gov.au/scams' });
      } catch (error) {
        window.open('https://moneysmart.gov.au/scams', '_blank');
      }
    },
    'Close this page immediately': () => {
      if (confirm('⚠️ Are you sure you want to close this potentially dangerous page?')) {
        window.close();
      }
    },
    'Change passwords now': () => {
      const message = `🔒 Security Alert: Change your passwords immediately!\n\n` +
                     `1. Go to your account settings\n` +
                     `2. Change passwords for any accounts you may have entered information for\n` +
                     `3. Enable two-factor authentication if available\n\n` +
                     `Would you like to open a password manager or account security page?`;
      
      if (confirm(message)) {
        try {
          chrome.tabs.create({ url: 'https://passwords.google.com/' });
        } catch (error) {
          window.open('https://passwords.google.com/', '_blank');
        }
      }
    }
  };
  
  // Execute specific action or show generic advice
  if (actions[step.action]) {
    actions[step.action]();
  } else {
    // Show detailed advice in a modal-like alert
    const advice = `${step.icon} ${step.title}\n\n${step.description}\n\n→ ${step.action}`;
    alert(advice);
  }
  
  // Provide visual feedback
  showActionFeedback(step);
}

// Show visual feedback when a next step is clicked
function showActionFeedback(step) {
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 10002;
    background: #4caf50; color: white; padding: 12px 16px; border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideInRight 0.3s ease;
    font-size: 12px; font-weight: 500;
  `;
  feedback.innerHTML = `✅ ${step.title} - Action taken`;
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    feedback.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => feedback.remove(), 300);
  }, 2500);
}

// Main function
async function main() {
  try {
    console.log('🎯 ScamLens Pro starting...');
    
    // Load rules and whitelist
    await Promise.all([loadRules(), loadWhitelist()]);
    
    // Check if current domain is whitelisted
    const currentDomain = window.location.hostname;
    if (whitelistedDomains.has(currentDomain)) {
      console.log(`✅ Domain ${currentDomain} is whitelisted - skipping scan`);
      return;
    }
    
    // Get page text
    const text = getVisibleText();
    console.log(`📄 Page text length: ${text.length} characters`);
    
    // Scan for scam patterns
    const hits = scanText(text);
    
    // Show banner if patterns found
    if (hits.length > 0) {
      showBanner(hits);
    } else {
      console.log('✅ No scam patterns detected');
    }
    
  } catch (error) {
    console.error('❌ ScamLens Pro failed:', error);
  }
}

// Start when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
