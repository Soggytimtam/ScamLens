// Balanced AI Engine - ScamLens Pro
// Designed to reduce false positives while maintaining detection accuracy

class AIEngine {
  constructor() {
    this.rules = [];
    this.alerts = [];
    this.isInitialized = false;
    this.compiledPatterns = new Map();
  }

  async initialize() {
    try {
      await this.loadKnowledgeBase();
      this.precompilePatterns();
      this.isInitialized = true;
      console.log('✅ AI Engine initialized successfully');
    } catch (error) {
      console.error('❌ AI Engine initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async loadKnowledgeBase() {
    try {
      const acccResponse = await fetch(chrome.runtime.getURL('rules/accc_rules.json'));
      this.rules = await acccResponse.json();
      
      const alertsResponse = await fetch(chrome.runtime.getURL('rules/scamwatch_alerts.json'));
      this.alerts = await alertsResponse.json();
      
      console.log(`📚 Loaded ${this.rules.length} ACCC rules and ${this.alerts.alerts?.length || 0} Scamwatch alerts`);
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
      this.rules = [];
      this.alerts = [];
    }
  }

  precompilePatterns() {
    this.compiledPatterns.clear();
    
    this.rules.forEach(rule => {
      try {
        this.compiledPatterns.set(rule.id, new RegExp(rule.pattern, 'i'));
      } catch (error) {
        console.warn(`Invalid regex pattern for rule ${rule.id}:`, rule.pattern);
      }
    });
    
    if (this.alerts.alerts) {
      this.alerts.alerts.forEach(alert => {
        try {
          this.compiledPatterns.set(alert.id, new RegExp(alert.pattern, 'i'));
        } catch (error) {
          console.warn(`Invalid regex pattern for alert ${alert.id}:`, alert.pattern);
        }
      });
    }
    
    console.log(`🔧 Pre-compiled ${this.compiledPatterns.size} regex patterns`);
  }

  async analyzeContent(text, urls = []) {
    if (!this.isInitialized) {
      return this.fallbackAnalysis(text);
    }

    try {
      const results = await this.performAnalysis(text, urls);
      return results;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.fallbackAnalysis(text);
    }
  }

  async performAnalysis(text, urls) {
    const results = {
      riskScore: 0,
      riskLevel: 'green',
      confidence: 0.5,
      detectedPatterns: [],
      legitimateSignals: [],
      behavioralAnalysis: {},
      domainAnalysis: {},
      contextAnalysis: {},
      explanations: [],
      recommendations: []
    };

    // Pattern analysis (reduced weight)
    const patternResults = this.analyzePatterns(text);
    results.detectedPatterns = patternResults.patterns;
    results.riskScore += patternResults.riskScore * 0.3; // Reduced from 1.0 to 0.3

    // Behavioral analysis (reduced weight)
    results.behavioralAnalysis = this.analyzeBehavioralPatterns(text);
    results.riskScore += results.behavioralAnalysis.riskScore * 0.2; // Reduced weight

    // Domain analysis (reduced weight)
    results.domainAnalysis = await this.analyzeDomainReputation(urls);
    results.riskScore += results.domainAnalysis.riskScore * 0.2; // Reduced weight

    // Context analysis (reduced weight)
    results.contextAnalysis = this.analyzeContext(text);
    results.riskScore += results.contextAnalysis.riskScore * 0.1; // Reduced weight

    // Legitimate business detection (increased weight)
    const legitimateResults = this.detectLegitimateBusinesses(text, urls);
    results.legitimateSignals = legitimateResults.signals;
    results.riskScore -= legitimateResults.trustScore * 1.5; // Increased trust weight

    // Normalize risk score to be more conservative
    results.riskScore = Math.max(0, Math.min(1, (results.riskScore + 0.5) / 1.5));
    
    // Calculate confidence
    results.confidence = this.calculateConfidence(results);
    
    // Determine risk level with higher thresholds
    results.riskLevel = this.determineRiskLevel(results);
    
    // Generate explanations and recommendations
    results.explanations = this.generateExplanations(results);
    results.recommendations = this.generateRecommendations(results);

    return results;
  }

  analyzePatterns(text) {
    const patterns = [];
    let riskScore = 0;
    const processedText = text.toLowerCase();

    this.compiledPatterns.forEach((regex, id) => {
      if (regex.test(processedText)) {
        const item = this.findKnowledgeItem(id);
        if (item) {
          const weight = this.getPatternWeight(item.severity);
          riskScore += weight;
          
          patterns.push({
            id: id,
            pattern: regex.source,
            severity: item.severity,
            weight: weight,
            why: item.why,
            source: item.source || 'Unknown',
            learnMore: item.learn_more
          });
        }
      }
    });

    return { patterns, riskScore };
  }

  getPatternWeight(severity) {
    const weights = { 'high': 0.4, 'med': 0.2, 'low': 0.1 }; // Reduced weights
    return weights[severity] || 0.1;
  }

  analyzeBehavioralPatterns(text) {
    const analysis = {
      riskScore: 0,
      patterns: [],
      explanations: []
    };

    // Only flag very obvious scam patterns
    const behavioralPatterns = {
      urgencyPressure: {
        pattern: /(?:act\s+now|immediate|urgent|24\s*hours?|countdown|expires?|last\s+chance|final\s+warning|deadline)/gi,
        weight: 0.3, // Reduced weight
        description: 'False urgency to pressure quick decisions'
      },
      socialEngineering: {
        pattern: /(?:trust\s+me|i\s+promise|guaranteed|100%\s+safe|no\s+risk)/gi,
        weight: 0.2, // Reduced weight
        description: 'Social engineering tactics to build false trust'
      },
      authorityImpersonation: {
        pattern: /(?:police|government|ato|mygov|bank|microsoft|apple|google|netflix|amazon)/gi,
        weight: 0.4, // Reduced weight
        description: 'Impersonating trusted authorities or brands'
      },
      paymentRedFlags: {
        pattern: /(?:gift\s+cards?|bitcoin|crypto|western\s+union|money\s+gram|prepaid\s+cards?)/gi,
        weight: 0.5, // Reduced weight
        description: 'Suspicious payment methods commonly used in scams'
      },
      threatsAndCoercion: {
        pattern: /(?:legal\s+action|arrest|warrant|court|jail|fine|penalty|account\s+closed|access\s+lost)/gi,
        weight: 0.5, // Reduced weight
        description: 'Threats and coercion tactics'
      }
    };

    Object.entries(behavioralPatterns).forEach(([key, config]) => {
      const matches = text.match(config.pattern);
      if (matches) {
        analysis.riskScore += config.weight;
        analysis.patterns.push({
          type: key,
          matches: matches,
          weight: config.weight,
          description: config.description
        });
        analysis.explanations.push(`${config.description}: "${matches[0]}"`);
      }
    });

    return analysis;
  }

  async analyzeDomainReputation(urls) {
    const analysis = {
      riskScore: 0,
      suspiciousDomains: [],
      explanations: []
    };

    for (const url of urls) {
      try {
        const domain = new URL(url).hostname;
        const reputation = this.checkDomainReputation(domain);
        
        if (reputation.risk > 0.7) { // Increased threshold
          analysis.riskScore += reputation.risk;
          analysis.suspiciousDomains.push({
            domain: domain,
            risk: reputation.risk,
            reasons: reputation.reasons
          });
          analysis.explanations.push(`Suspicious domain: ${domain} - ${reputation.reasons.join(', ')}`);
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }

    return analysis;
  }

  checkDomainReputation(domain) {
    const reputation = {
      risk: 0,
      reasons: []
    };

    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.xyz', '.top', '.club'];
    const tld = domain.split('.').pop().toLowerCase();
    if (suspiciousTLDs.includes(`.${tld}`)) {
      reputation.risk += 0.4; // Reduced risk
      reputation.reasons.push('Suspicious top-level domain');
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
      reputation.risk += 0.6; // Reduced risk
      reputation.reasons.push('Direct IP address (suspicious)');
    }

    if (domain.includes('bit.ly') || domain.includes('tinyurl') || domain.includes('goo.gl')) {
      reputation.risk += 0.5; // Reduced risk
      reputation.reasons.push('URL shortener (can hide malicious destinations)');
    }

    const brandKeywords = ['microsoft', 'apple', 'google', 'netflix', 'amazon', 'paypal', 'mygov', 'ato'];
    const domainLower = domain.toLowerCase();
    brandKeywords.forEach(brand => {
      if (domainLower.includes(brand) && !domainLower.includes(`.${brand}.`)) {
        reputation.risk += 0.6; // Reduced risk
        reputation.reasons.push(`Potential ${brand} impersonation`);
      }
    });

    return reputation;
  }

  analyzeContext(text) {
    const analysis = {
      riskScore: 0,
      context: {},
      explanations: []
    };

    const textAnalysis = this.analyzeTextQuality(text);
    analysis.context.textQuality = textAnalysis;
    
    if (textAnalysis.grammarErrors > 10) { // Increased threshold
      analysis.riskScore += 0.2; // Reduced risk
      analysis.explanations.push('Multiple grammar errors detected (common in scams)');
    }

    if (textAnalysis.professionalScore < 0.2) { // Lowered threshold
      analysis.riskScore += 0.3; // Reduced risk
      analysis.explanations.push('Unprofessional language patterns detected');
    }

    return analysis;
  }

  analyzeTextQuality(text) {
    const analysis = {
      grammarErrors: 0,
      professionalScore: 0,
      suspiciousPhrases: 0
    };

    const grammarPatterns = [
      /\b(?:your|you're)\s+(?:account|details|information)\s+(?:need|needs)\s+/gi,
      /\b(?:click\s+here|click\s+this|click\s+now)\s+/gi,
      /\b(?:dear\s+customer|valued\s+client)\s+/gi,
      /\b(?:congratulations|you\s+won|winner)\s+/gi
    ];

    grammarPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        analysis.grammarErrors += matches.length;
        analysis.suspiciousPhrases += matches.length;
      }
    });

    const professionalTerms = [
      'established', 'professional', 'certified', 'licensed', 'registered',
      'contact', 'support', 'customer service', 'business hours', 'privacy policy'
    ];

    const unprofessionalTerms = [
      'act now', 'urgent', 'immediate', 'last chance', 'don\'t miss out',
      'free money', 'get rich quick', 'guaranteed returns'
    ];

    const professionalCount = professionalTerms.filter(term => 
      text.toLowerCase().includes(term)
    ).length;
    
    const unprofessionalCount = unprofessionalTerms.filter(term => 
      text.toLowerCase().includes(term)
    ).length;

    analysis.professionalScore = Math.max(0, (professionalCount - unprofessionalCount) / professionalTerms.length);

    return analysis;
  }

  detectLegitimateBusinesses(text, urls) {
    const signals = [];
    let trustScore = 0;

    const strongSignals = [
      { pattern: /(?:https:\/\/[^\/]+\/)/i, weight: 0.8, description: 'HTTPS encryption' },
      { pattern: /(?:contact\s+us|about\s+us|privacy\s+policy|terms\s+of\s+service)/i, weight: 0.8, description: 'Professional pages' },
      { pattern: /(?:established\s+since|founded\s+in|since\s+\d{4})/i, weight: 0.8, description: 'Established history' },
      { pattern: /(?:australian\s+business\s+number|abn\s+\d{9,11})/i, weight: 1.0, description: 'Australian business registration' },
      { pattern: /(?:acn\s+\d{9}|acn\s+\d{3}\s+\d{3}\s+\d{3})/i, weight: 1.0, description: 'Australian company number' }
    ];

    const mediumSignals = [
      { pattern: /(?:phone\s+number|email|address|postal\s+code)/i, weight: 0.6, description: 'Contact information' },
      { pattern: /(?:business\s+hours|opening\s+times|trading\s+hours)/i, weight: 0.6, description: 'Business hours' },
      { pattern: /(?:customer\s+service|support|help\s+desk)/i, weight: 0.6, description: 'Customer service' },
      { pattern: /(?:secure\s+payment|ssl\s+certificate|encryption)/i, weight: 0.6, description: 'Security badges' }
    ];

    strongSignals.forEach(signal => {
      if (signal.pattern.test(text)) {
        signals.push({
          type: 'strong',
          weight: signal.weight,
          description: signal.description
        });
        trustScore += signal.weight;
      }
    });

    mediumSignals.forEach(signal => {
      if (signal.pattern.test(text)) {
        signals.push({
          type: 'medium',
          weight: signal.weight,
          description: signal.description
        });
        trustScore += signal.weight;
      }
    });

    return { signals, trustScore };
  }

  calculateConfidence(results) {
    let confidence = 0.5;

    if (results.detectedPatterns.length > 0) {
      const avgWeight = results.detectedPatterns.reduce((sum, p) => sum + p.weight, 0) / results.detectedPatterns.length;
      confidence += avgWeight * 0.2; // Reduced weight
    }

    if (results.behavioralAnalysis.patterns.length > 0) {
      const avgWeight = results.behavioralAnalysis.patterns.reduce((sum, p) => sum + p.weight, 0) / results.behavioralAnalysis.patterns.length;
      confidence += avgWeight * 0.15; // Reduced weight
    }

    if (results.domainAnalysis.suspiciousDomains.length > 0) {
      confidence += results.domainAnalysis.riskScore * 0.1; // Reduced weight
    }

    confidence += results.contextAnalysis.riskScore * 0.05; // Reduced weight

    return Math.min(0.95, Math.max(0.05, confidence));
  }

  determineRiskLevel(results) {
    let riskLevel = 'green';
    
    // Much higher thresholds for risk levels
    if (results.riskScore > 0.8) { // Increased from 0.75
      riskLevel = 'red';
    } else if (results.riskScore > 0.6) { // Increased from 0.5
      riskLevel = 'amber';
    } else if (results.riskScore > 0.4) { // Increased from 0.25
      riskLevel = 'yellow';
    }

    const highRiskPatterns = results.detectedPatterns.filter(p => p.severity === 'high');
    if (highRiskPatterns.length >= 3) { // Increased from 2
      riskLevel = 'red';
    } else if (highRiskPatterns.length === 1 && results.riskScore > 0.6) { // Increased threshold
      riskLevel = 'amber';
    }

    const strongSignals = results.legitimateSignals.filter(s => s.type === 'strong');
    if (strongSignals.length >= 2) { // Reduced from 3
      if (riskLevel === 'red') riskLevel = 'amber';
      else if (riskLevel === 'amber') riskLevel = 'yellow';
      else if (riskLevel === 'yellow') riskLevel = 'green';
    }

    return riskLevel;
  }

  generateExplanations(results) {
    const explanations = [];
    
    if (results.detectedPatterns.length > 0) {
      const highRiskCount = results.detectedPatterns.filter(p => p.severity === 'high').length;
      const mediumRiskCount = results.detectedPatterns.filter(p => p.severity === 'med').length;
      
      if (highRiskCount > 0) {
        explanations.push(`🚨 ${highRiskCount} high-risk scam patterns detected by ACCC/Scamwatch. These are verified indicators of fraudulent activity.`);
      }
      if (mediumRiskCount > 0) {
        explanations.push(`⚠️ ${mediumRiskCount} suspicious patterns identified. These require careful verification before proceeding.`);
      }
    }

    if (results.behavioralAnalysis.patterns.length > 0) {
      const behavioralRisk = results.behavioralAnalysis.riskScore;
      if (behavioralRisk > 0.8) { // Increased threshold
        explanations.push(`🧠 Advanced behavioral analysis detected sophisticated social engineering tactics. This suggests a well-crafted scam.`);
      } else if (behavioralRisk > 0.5) { // Increased threshold
        explanations.push(`🧠 Behavioral analysis identified suspicious communication patterns. Exercise caution.`);
      }
    }

    if (results.domainAnalysis.suspiciousDomains.length > 0) {
      explanations.push(`🌐 Domain reputation analysis flagged ${results.domainAnalysis.suspiciousDomains.length} suspicious domains. Check destinations carefully.`);
    }

    if (results.contextAnalysis.riskScore > 0.6) { // Increased threshold
      explanations.push(`📝 Content analysis suggests unprofessional or suspicious language patterns commonly used in scams.`);
    }

    if (results.legitimateSignals.length > 0) {
      const strongCount = results.legitimateSignals.filter(s => s.type === 'strong').length;
      if (strongCount > 0) {
        explanations.push(`✅ ${strongCount} strong legitimate business indicators detected. This reduces the likelihood of a scam.`);
      }
    }

    return explanations;
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    if (results.riskLevel === 'red') {
      recommendations.push('🚨 **CRITICAL RISK** - Do not proceed with any actions on this page');
      recommendations.push('📞 Contact the real organization using official contact details from their website');
      recommendations.push('🔒 Report this to Scamwatch immediately: https://portal.scamwatch.gov.au/report-a-scam/');
      recommendations.push('💳 Never provide payment information, passwords, or personal details');
      recommendations.push('🔐 Enable two-factor authentication on all your accounts');
    } else if (results.riskLevel === 'amber') {
      recommendations.push('⚠️ **HIGH CAUTION** - Verify all information independently before proceeding');
      recommendations.push('📱 Call the organization using a known phone number (not from this page)');
      recommendations.push('🔍 Look for additional warning signs and inconsistencies');
      recommendations.push('📧 Check the sender\'s email address carefully for spoofing');
      recommendations.push('🌐 Visit the official website directly (not through links on this page)');
    } else if (results.riskLevel === 'yellow') {
      recommendations.push('🟡 **MODERATE CAUTION** - Some suspicious elements detected');
      recommendations.push('👀 Remain vigilant for any suspicious behavior or requests');
      recommendations.push('📋 Verify important details through independent sources');
      recommendations.push('📝 Report any concerns to help improve detection');
    } else {
      recommendations.push('✅ **LIKELY SAFE** - Standard security checks passed');
      recommendations.push('👀 Remain vigilant for any suspicious behavior');
      recommendations.push('📝 Report any concerns to help improve detection');
    }

    if (results.detectedPatterns.some(p => p.severity === 'high')) {
      recommendations.push('💳 **NEVER** provide payment information to suspicious requests');
      recommendations.push('🔐 Enable two-factor authentication on all financial accounts');
      recommendations.push('📱 Use official apps and websites for sensitive transactions');
    }

    if (results.behavioralAnalysis.patterns.some(p => p.type === 'authorityImpersonation')) {
      recommendations.push('🏛️ **VERIFY AUTHORITY** - Contact the real organization directly');
      recommendations.push('📞 Use phone numbers from official websites, not from emails or messages');
      recommendations.push('🔍 Check for official communication channels and procedures');
    }

    if (results.domainAnalysis.suspiciousDomains.length > 0) {
      recommendations.push('🌐 **CHECK DOMAINS** - Verify all URLs before clicking');
      recommendations.push('🔗 Be suspicious of shortened URLs and redirects');
      recommendations.push('📱 Type important URLs manually rather than clicking links');
    }

    return recommendations;
  }

  fallbackAnalysis(text) {
    const basicHits = this.scanBasicRules(text);
    const confidence = basicHits.length > 0 ? 0.4 : 0.1; // Reduced confidence
    
    return {
      riskLevel: confidence > 0.3 ? 'yellow' : 'green', // More conservative
      confidence: confidence,
      detectedPatterns: basicHits,
      legitimateSignals: [],
      behavioralAnalysis: { riskScore: 0, patterns: [] },
      domainAnalysis: { riskScore: 0, suspiciousDomains: [] },
      contextAnalysis: { riskScore: 0, context: {} },
      explanations: basicHits.map(hit => `[${hit.source}] ${hit.why}`),
      recommendations: ['Use basic detection - AI features not available. Consider enabling JavaScript and TensorFlow.js for enhanced protection.']
    };
  }

  scanBasicRules(text) {
    const hits = [];
    
    this.rules.forEach(rule => {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(text)) {
          hits.push({ ...rule, source: 'ACCC' });
        }
      } catch (_) {}
    });
    
    return hits;
  }

  findKnowledgeItem(id) {
    const rule = this.rules.find(r => r.id === id);
    if (rule) return { ...rule, source: 'ACCC' };
    
    if (this.alerts.alerts) {
      const alert = this.alerts.alerts.find(a => a.id === id);
      if (alert) return { ...alert, source: 'Scamwatch' };
    }
    
    return null;
  }

  dispose() {
    this.compiledPatterns.clear();
  }
}

// Export for use in other modules
window.AIEngine = AIEngine;
