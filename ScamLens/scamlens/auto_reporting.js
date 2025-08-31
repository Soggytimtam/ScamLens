// Automatic Scamwatch Reporting System

class AutoReporting {
  constructor() {
    this.reportTemplate = {
      scamType: '',
      description: '',
      contactMethod: '',
      financialLoss: false,
      amount: '',
      scammerDetails: {},
      evidence: []
    };
  }

  // Generate report data from detected signals
  generateReportData(detectedSignals, pageUrl, pageContent) {
    const report = { ...this.reportTemplate };
    
    // Determine scam type based on signals
    report.scamType = this.categorizeScamType(detectedSignals);
    
    // Generate description
    report.description = this.generateDescription(detectedSignals, pageContent);
    
    // Determine contact method
    report.contactMethod = this.detectContactMethod(pageContent);
    
    // Check for financial indicators
    const financialInfo = this.detectFinancialIndicators(pageContent);
    report.financialLoss = financialInfo.hasFinancialContent;
    report.amount = financialInfo.amount;
    
    // Extract scammer details
    report.scammerDetails = this.extractScammerDetails(pageContent, pageUrl);
    
    // Collect evidence
    report.evidence = this.collectEvidence(detectedSignals, pageUrl);
    
    return report;
  }

  // Categorize the type of scam based on detected signals
  categorizeScamType(signals) {
    const categories = {
      'investment': ['investment', 'bonds', 'returns', 'crypto', 'forex'],
      'phishing': ['verify', 'password', 'login', 'account', 'credentials'],
      'impersonation': ['bank', 'government', 'support', 'microsoft', 'apple'],
      'extortion': ['hacked', 'webcam', 'compromising', 'threaten', 'release'],
      'romance': ['romance', 'dating', 'emergency', 'help', 'money'],
      'shopping': ['fake', 'website', 'brand', 'product', 'purchase'],
      'delivery': ['package', 'delivery', 'customs', 'fee', 'post office'],
      'tech_support': ['computer', 'virus', 'support', 'remote', 'access']
    };

    let maxScore = 0;
    let bestCategory = 'other';

    for (const [category, keywords] of Object.entries(categories)) {
      let score = 0;
      for (const signal of signals) {
        for (const keyword of keywords) {
          if (signal.why.toLowerCase().includes(keyword)) {
            score++;
          }
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  // Generate a detailed description of the scam
  generateDescription(signals, pageContent) {
    let description = 'ScamLens detected multiple scam signals on this page:\n\n';
    
    signals.forEach((signal, index) => {
      description += `${index + 1}. ${signal.why}\n`;
    });
    
    description += `\nPage URL: ${window.location.href}\n`;
    description += `Detection time: ${new Date().toLocaleString()}\n`;
    description += `Confidence level: High (multiple signals detected)\n`;
    
    return description;
  }

  // Detect how the scammer contacted the victim
  detectContactMethod(content) {
    const contactMethods = {
      'email': ['email', 'mail', 'inbox', 'message'],
      'phone': ['phone', 'call', 'telephone', 'mobile', 'sms'],
      'social_media': ['facebook', 'instagram', 'twitter', 'linkedin', 'social'],
      'website': ['website', 'site', 'webpage', 'online'],
      'text': ['text', 'sms', 'message', 'whatsapp']
    };

    for (const [method, keywords] of Object.entries(contactMethods)) {
      if (keywords.some(keyword => content.toLowerCase().includes(keyword))) {
        return method;
      }
    }
    
    return 'unknown';
  }

  // Detect financial content and amounts
  detectFinancialIndicators(content) {
    const result = {
      hasFinancialContent: false,
      amount: ''
    };

    // Check for financial keywords
    const financialKeywords = [
      'payment', 'money', 'bank', 'account', 'transfer', 'deposit',
      'withdraw', 'balance', 'credit', 'debit', 'fee', 'charge'
    ];

    result.hasFinancialContent = financialKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );

    // Extract amounts (currency patterns)
    const amountPatterns = [
      /\$[\d,]+\.?\d*/g,           // $1,234.56
      /[\d,]+\.?\d*\s*(dollars?|aud)/gi,  // 1234.56 dollars
      /[\d,]+\.?\d*\s*(euros?|eur)/gi,    // 1234.56 euros
      /[\d,]+\.?\d*\s*(pounds?|gbp)/gi    // 1234.56 pounds
    ];

    for (const pattern of amountPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        result.amount = matches[0];
        break;
      }
    }

    return result;
  }

  // Extract details about the scammer
  extractScammerDetails(content, url) {
    const details = {
      name: '',
      organization: '',
      email: '',
      phone: '',
      website: url,
      address: ''
    };

    // Extract email addresses
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = content.match(emailPattern);
    if (emails && emails.length > 0) {
      details.email = emails[0];
    }

    // Extract phone numbers
    const phonePattern = /(\+?61|0)[2-478](?:[ -]?[0-9]){8}/g;
    const phones = content.match(phonePattern);
    if (phones && phones.length > 0) {
      details.phone = phones[0];
    }

    // Extract organization names (common patterns)
    const orgPatterns = [
      /(?:from|by|contact)\s+([A-Z][a-zA-Z\s&]+(?:Ltd|Pty|Inc|Corp|Company))/gi,
      /([A-Z][a-zA-Z\s&]+(?:Bank|Insurance|Finance|Services))/gi
    ];

    for (const pattern of orgPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        details.organization = matches[0].replace(/^(?:from|by|contact)\s+/i, '');
        break;
      }
    }

    return details;
  }

  // Collect evidence for the report
  collectEvidence(signals, pageUrl) {
    const evidence = [];
    
    // Add detected signals as evidence
    signals.forEach(signal => {
      evidence.push({
        type: 'detected_signal',
        description: signal.why,
        severity: signal.severity,
        pattern: signal.pattern
      });
    });

    // Add page screenshot (if available)
    evidence.push({
      type: 'page_url',
      description: 'Suspicious webpage',
      value: pageUrl
    });

    // Add detection timestamp
    evidence.push({
      type: 'timestamp',
      description: 'Detection time',
      value: new Date().toISOString()
    });

    return evidence;
  }

  // Pre-fill Scamwatch form with detected data
  async prefillScamwatchForm(reportData) {
    try {
      // Store report data for the form
      await chrome.storage.local.set({ 
        'scamwatchReportData': reportData,
        'reportTimestamp': new Date().toISOString()
      });

      // Open Scamwatch reporting form
      const formUrl = 'https://portal.scamwatch.gov.au/report-a-scam/';
      
      // Create a new tab with the form
      const tab = await chrome.tabs.create({ url: formUrl });
      
      // Inject script to pre-fill the form (when the page loads)
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this.injectFormPrefiller,
        args: [reportData]
      });

      return tab;
    } catch (error) {
      console.error('Failed to pre-fill Scamwatch form:', error);
      throw error;
    }
  }

  // Function to inject into Scamwatch page for form pre-filling
  injectFormPrefiller(reportData) {
    // Wait for the form to load
    const waitForForm = setInterval(() => {
      const form = document.querySelector('form');
      if (form) {
        clearInterval(waitForForm);
        this.fillFormFields(form, reportData);
      }
    }, 1000);

    // Timeout after 10 seconds
    setTimeout(() => clearInterval(waitForForm), 10000);
  }

  // Fill in the Scamwatch form fields
  fillFormFields(form, reportData) {
    try {
      // Map our data to form fields (adjust based on actual form structure)
      const fieldMappings = {
        'scam_type': reportData.scamType,
        'description': reportData.description,
        'contact_method': reportData.contactMethod,
        'financial_loss': reportData.financialLoss ? 'Yes' : 'No',
        'amount': reportData.amount,
        'scammer_email': reportData.scammerDetails.email,
        'scammer_phone': reportData.scammerDetails.phone,
        'scammer_website': reportData.scammerDetails.website
      };

      // Fill each field
      for (const [fieldName, value] of Object.entries(fieldMappings)) {
        const field = form.querySelector(`[name="${fieldName}"], [id="${fieldName}"]`);
        if (field && value) {
          if (field.type === 'checkbox' || field.type === 'radio') {
            field.checked = value === 'Yes';
          } else {
            field.value = value;
          }
        }
      }

      // Show success message
      this.showPrefillSuccess();
    } catch (error) {
      console.error('Error filling form:', error);
    }
  }

  // Show success message for pre-filling
  showPrefillSuccess() {
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed; top: 20px; right: 20px; 
      background: #4caf50; color: white; padding: 15px; 
      border-radius: 5px; z-index: 10000; font-family: Arial, sans-serif;
    `;
    message.innerHTML = `
      ✅ ScamLens has pre-filled this form with detected scam information.<br>
      Please review and submit the report.
    `;
    document.body.appendChild(message);
    
    // Remove after 5 seconds
    setTimeout(() => message.remove(), 5000);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoReporting;
}

