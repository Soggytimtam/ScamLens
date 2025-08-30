// False Positive Prevention System for ScamLens

class FalsePositivePrevention {
  constructor() {
    this.whitelist = new Set();
    this.confidenceThresholds = {
      high: 0.8,    // 80% confidence required for red banner
      medium: 0.6,  // 60% confidence required for amber banner
      low: 0.4      // 40% confidence required for any banner
    };
    this.contextKeywords = {
      legitimate: ['official', 'verified', 'secure', 'https', 'government', 'bank', 'insurance'],
      suspicious: ['urgent', 'immediately', 'account suspended', 'verify now', 'click here']
    };
    this.loadWhitelist();
  }

  async loadWhitelist() {
    try {
      const { whitelist = [] } = await chrome.storage.local.get(['whitelist']);
      this.whitelist = new Set(whitelist);
    } catch (error) {
      console.warn('Failed to load whitelist:', error);
    }
  }

  // Analyze context to determine if signals are legitimate
  analyzeContext(text, url, domain) {
    let contextScore = 0;
    let reasons = [];

    // Check domain reputation
    if (this.isTrustedDomain(domain)) {
      contextScore += 0.3;
      reasons.push('Trusted domain');
    }

    // Check for legitimate business indicators
    if (this.hasLegitimateIndicators(text)) {
      contextScore += 0.2;
      reasons.push('Legitimate business indicators');
    }

    // Check for suspicious urgency patterns
    if (this.hasSuspiciousPatterns(text)) {
      contextScore -= 0.3;
      reasons.push('Suspicious urgency patterns');
    }

    // Check URL security
    if (url.startsWith('https://')) {
      contextScore += 0.1;
      reasons.push('Secure connection');
    }

    // Check for official branding
    if (this.hasOfficialBranding(text)) {
      contextScore += 0.2;
      reasons.push('Official branding present');
    }

    return { score: Math.max(0, Math.min(1, contextScore)), reasons };
  }

  isTrustedDomain(domain) {
    const trustedDomains = [
      'gov.au', 'govt.nz', 'gc.ca', 'gov.uk', 'europa.eu',
      'commonwealthbank.com.au', 'westpac.com.au', 'nab.com.au', 'anz.com.au',
      'ato.gov.au', 'mygov.gov.au', 'medicare.gov.au', 'centrelink.gov.au',
      'amazon.com', 'ebay.com', 'paypal.com', 'stripe.com'
    ];
    
    return trustedDomains.some(trusted => domain.includes(trusted));
  }

  hasLegitimateIndicators(text) {
    const indicators = [
      'privacy policy', 'terms of service', 'contact us', 'about us',
      'customer service', 'support', 'help', 'faq', 'legal',
      'registered business', 'abn', 'acn', 'licence number'
    ];
    
    return indicators.some(indicator => 
      text.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  hasSuspiciousPatterns(text) {
    const patterns = [
      'urgent action required', 'account will be closed', 'immediate response needed',
      'click here now', 'verify immediately', 'final warning',
      'unusual activity detected', 'suspicious login attempt'
    ];
    
    return patterns.some(pattern => 
      text.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  hasOfficialBranding(text) {
    const officialTerms = [
      'australian government', 'commonwealth of australia', 'crown copyright',
      'official website', 'authorized representative', 'licensed provider'
    ];
    
    return officialTerms.some(term => 
      text.toLowerCase().includes(term.toLowerCase())
    );
  }

  // Calculate confidence score based on multiple factors
  calculateConfidence(ruleHits, contextScore, urlScore, userFeedback = 0) {
    let confidence = 0;
    
    // Rule-based confidence (40% weight)
    const ruleConfidence = Math.min(ruleHits.length * 0.2, 0.4);
    confidence += ruleConfidence;
    
    // Context confidence (30% weight)
    confidence += contextScore * 0.3;
    
    // URL blocklist confidence (20% weight)
    confidence += urlScore * 0.2;
    
    // User feedback confidence (10% weight)
    confidence += userFeedback * 0.1;
    
    return Math.min(1, confidence);
  }

  // Determine if we should show a banner based on confidence
  shouldShowBanner(confidence, severity) {
    const threshold = this.confidenceThresholds[severity] || this.confidenceThresholds.low;
    return confidence >= threshold;
  }

  // Filter out false positives based on context
  filterFalsePositives(ruleHits, text, url, domain) {
    const context = this.analyzeContext(text, url, domain);
    const filteredHits = [];
    
    for (const hit of ruleHits) {
      // Skip if this is a whitelisted pattern
      if (this.whitelist.has(hit.id)) {
        continue;
      }
      
      // Calculate confidence for this specific hit
      const confidence = this.calculateConfidence(
        [hit], 
        context.score, 
        0, // URL score for individual rules
        0  // User feedback
      );
      
      // Only include if confidence meets threshold
      if (this.shouldShowBanner(confidence, hit.severity)) {
        filteredHits.push({
          ...hit,
          confidence: confidence,
          contextReasons: context.reasons
        });
      }
    }
    
    return filteredHits;
  }

  // Add domain/pattern to whitelist
  async addToWhitelist(domainOrPattern, reason = 'User whitelisted') {
    this.whitelist.add(domainOrPattern);
    const whitelistArray = Array.from(this.whitelist);
    
    try {
      await chrome.storage.local.set({ 
        whitelist: whitelistArray,
        whitelistMetadata: {
          lastUpdated: new Date().toISOString(),
          totalItems: whitelistArray.length
        }
      });
      console.log(`Added ${domainOrPattern} to whitelist`);
    } catch (error) {
      console.error('Failed to save whitelist:', error);
    }
  }

  // Remove from whitelist
  async removeFromWhitelist(domainOrPattern) {
    this.whitelist.delete(domainOrPattern);
    const whitelistArray = Array.from(this.whitelist);
    
    try {
      await chrome.storage.local.set({ 
        whitelist: whitelistArray,
        whitelistMetadata: {
          lastUpdated: new Date().toISOString(),
          totalItems: whitelistArray.length
        }
      });
      console.log(`Removed ${domainOrPattern} from whitelist`);
    } catch (error) {
      console.error('Failed to save whitelist:', error);
    }
  }

  // Get whitelist status
  getWhitelistStatus() {
    return {
      totalItems: this.whitelist.size,
      items: Array.from(this.whitelist),
      metadata: {
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FalsePositivePrevention;
}

