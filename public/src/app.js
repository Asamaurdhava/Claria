/**
 * Claria - Complex Text Made Simple
 * Chrome AI Challenge 2025 Submission
 *
 * Uses Chrome's built-in AI APIs:
 * - Language Model API for general text processing
 * - Writer API for content generation
 * - Rewriter API for text transformation
 * - Summarizer API for key point extraction
 */

(function() {
    'use strict';

    // Global application state
    const AppState = {
        mode: 'initializing',
        documentType: 'auto',
        complexityLevel: 'simple',
        chromeAI: {
            languageModel: false,
            writer: false,
            rewriter: false,
            summarizer: false
        },
        processing: false,
        lastProcessingTime: 0
    };

    // Utility functions
    const Utils = {
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        async withTimeout(promise, timeoutMs = 10000) {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
            );
            return Promise.race([promise, timeout]);
        },

        throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        formatTime(ms) {
            if (ms < 1000) return `${ms}ms`;
            return `${(ms / 1000).toFixed(1)}s`;
        },

        sanitizeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        calculateReadingTime(text) {
            const wordsPerMinute = 200;
            const words = text.trim().split(/\s+/).length;
            return Math.ceil(words / wordsPerMinute);
        },

        getTextComplexity(text) {
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const words = text.split(/\s+/).filter(w => w.length > 0);
            const avgWordsPerSentence = words.length / sentences.length;
            const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

            // Simple complexity score (0-100)
            return Math.min(100, Math.round((avgWordsPerSentence * 2) + (avgWordLength * 3)));
        },

        /**
         * Calculate Flesch-Kincaid Grade Level for readability scoring
         * Returns detailed readability metrics
         */
        calculateReadability(text) {
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const words = text.split(/\s+/).filter(w => w.length > 0);
            const syllables = words.reduce((count, word) => {
                return count + this.countSyllables(word);
            }, 0);

            if (sentences.length === 0 || words.length === 0) {
                return {
                    gradeLevel: 0,
                    readingAge: 5,
                    sentences: 0,
                    words: 0,
                    syllables: 0,
                    avgSentenceLength: 0,
                    avgSyllablesPerWord: 0,
                    complexity: 'Unknown'
                };
            }

            const avgSentenceLength = words.length / sentences.length;
            const avgSyllablesPerWord = syllables / words.length;

            // Flesch-Kincaid Grade Level formula
            const gradeLevel = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;
            const clampedGradeLevel = Math.max(1, Math.min(18, Math.round(gradeLevel)));

            return {
                gradeLevel: clampedGradeLevel,
                readingAge: clampedGradeLevel + 5, // Grade 3 = 8 years old
                sentences: sentences.length,
                words: words.length,
                syllables: syllables,
                avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
                avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
                complexity: this.getComplexityLabel(clampedGradeLevel)
            };
        },

        /**
         * Count syllables in a word (approximation)
         */
        countSyllables(word) {
            word = word.toLowerCase().trim();
            if (word.length <= 3) return 1;

            // Remove silent 'e' at end
            word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
            // Remove 'y' at start
            word = word.replace(/^y/, '');

            // Count vowel groups
            const matches = word.match(/[aeiouy]{1,2}/g);
            return matches ? matches.length : 1;
        },

        /**
         * Get human-readable complexity label from grade level
         */
        getComplexityLabel(grade) {
            if (grade <= 3) return 'Very Easy';
            if (grade <= 6) return 'Easy';
            if (grade <= 9) return 'Standard';
            if (grade <= 12) return 'High School';
            if (grade <= 16) return 'College';
            return 'Very Complex';
        }
    };

    // Chrome AI Integration - Enhanced for all four APIs
    const ChromeAI = {
        sessions: {
            languageModel: null,
            writer: null,
            rewriter: null,
            summarizer: null
        },

        async init() {
            console.log('Initializing Chrome AI APIs...');
            const results = {
                languageModel: false,
                writer: false,
                rewriter: false,
                summarizer: false
            };

            // Test Language Model API
            if (window.ai?.languageModel) {
                try {
                    const capabilities = await window.ai.languageModel.capabilities();
                    console.log('Language Model capabilities:', capabilities);

                    if (capabilities.available === 'readily') {
                        this.sessions.languageModel = await window.ai.languageModel.create({
                            systemPrompt: 'You are an expert text simplification assistant. Always provide clear, accurate simplifications while preserving the original meaning.',
                            temperature: 0.7,
                            topK: 40
                        });
                        results.languageModel = true;
                        console.log('✅ Language Model API ready');
                    } else if (capabilities.available === 'after-download') {
                        console.log('⏳ Language Model API downloading...');
                    }
                } catch (error) {
                    console.log('❌ Language Model API error:', error);
                }
            }

            // Test Writer API
            if (window.ai?.writer) {
                try {
                    const capabilities = await window.ai.writer.capabilities();
                    console.log('Writer capabilities:', capabilities);

                    if (capabilities.available === 'readily') {
                        results.writer = true;
                        console.log('✅ Writer API ready');
                    }
                } catch (error) {
                    console.log('❌ Writer API error:', error);
                }
            }

            // Test Rewriter API
            if (window.ai?.rewriter) {
                try {
                    const capabilities = await window.ai.rewriter.capabilities();
                    console.log('Rewriter capabilities:', capabilities);

                    if (capabilities.available === 'readily') {
                        results.rewriter = true;
                        console.log('✅ Rewriter API ready');
                    }
                } catch (error) {
                    console.log('❌ Rewriter API error:', error);
                }
            }

            // Test Summarizer API
            if (window.ai?.summarizer) {
                try {
                    const capabilities = await window.ai.summarizer.capabilities();
                    console.log('Summarizer capabilities:', capabilities);

                    if (capabilities.available === 'readily') {
                        results.summarizer = true;
                        console.log('✅ Summarizer API ready');
                    }
                } catch (error) {
                    console.log('❌ Summarizer API error:', error);
                }
            }

            // Update global state
            AppState.chromeAI = results;

            const availableAPIs = Object.values(results).filter(Boolean).length;
            console.log(`🤖 Chrome AI Status: ${availableAPIs}/4 APIs available`);

            return results;
        },

        async processText(text, documentType, complexityLevel) {
            if (!text || text.trim().length < 10) {
                throw new Error('Text too short for processing');
            }

            const startTime = performance.now();
            let result = null;
            let method = 'fallback';

            // Try only the first available Chrome AI API to avoid sequential delays
            try {
                if (this.sessions.languageModel || AppState.chromeAI.languageModel) {
                    console.log('Using Language Model API...');
                    result = await this.useLanguageModelAPI(text, documentType, complexityLevel);
                    if (result) method = 'languageModel';
                } else if (this.sessions.rewriter || AppState.chromeAI.rewriter) {
                    console.log('Using Rewriter API...');
                    result = await this.useRewriterAPI(text, documentType, complexityLevel);
                    if (result) method = 'rewriter';
                } else if (AppState.chromeAI.writer) {
                    console.log('Using Writer API...');
                    result = await this.useWriterAPI(text, documentType, complexityLevel);
                    if (result) method = 'writer';
                }
            } catch (error) {
                console.error('Chrome AI API error:', error);
                // Will return null and use fallback
            }

            const processingTime = performance.now() - startTime;

            return {
                text: result,
                method: method,
                processingTime: processingTime
            };
        },

        async useRewriterAPI(text, documentType, complexityLevel) {
            try {
                const tones = {
                    simple: 'casual',
                    standard: 'neutral',
                    educated: 'formal'
                };

                const rewriter = await window.ai.rewriter.create({
                    tone: tones[complexityLevel] || 'casual',
                    length: 'shorter'
                });

                const result = await Utils.withTimeout(
                    rewriter.rewrite(text),
                    10000 // 10 second timeout
                );
                await rewriter.destroy();

                return result;
            } catch (error) {
                console.error('Rewriter API error:', error);
                return null;
            }
        },

        async useLanguageModelAPI(text, documentType, complexityLevel) {
            if (!this.sessions.languageModel) {
                try {
                    this.sessions.languageModel = await window.ai.languageModel.create();
                } catch (error) {
                    console.error('Failed to create language model session:', error);
                    return null;
                }
            }

            try {
                const prompts = {
                    legal: 'Simplify this legal document into plain English that anyone can understand',
                    medical: 'Explain this medical information in everyday terms that patients can easily grasp',
                    technical: 'Clarify this technical content for non-experts, removing jargon',
                    academic: 'Summarize this academic text in simple, accessible language',
                    financial: 'Explain this financial document in terms anyone can understand',
                    auto: 'Simplify and clarify this text while preserving all important information'
                };

                const levels = {
                    simple: 'Use language suitable for a 10-year-old. Use short sentences and common words only.',
                    standard: 'Use language suitable for a high school student. Be clear and straightforward.',
                    educated: 'Use language suitable for a college-educated adult. Be clear but can use more sophisticated vocabulary.'
                };

                const prompt = `${prompts[documentType]}. ${levels[complexityLevel]}\n\nOriginal text:\n"${text}"\n\nSimplified version:`;

                const result = await Utils.withTimeout(
                    this.sessions.languageModel.prompt(prompt),
                    10000 // 10 second timeout
                );
                return result;
            } catch (error) {
                console.error('Language Model API error:', error);
                return null;
            }
        },

        async useWriterAPI(text, documentType, complexityLevel) {
            try {
                const tones = {
                    simple: 'casual',
                    standard: 'neutral',
                    educated: 'formal'
                };

                const writer = await window.ai.writer.create({
                    tone: tones[complexityLevel] || 'casual',
                    length: 'medium'
                });

                const prompt = `Simplify this ${documentType} text: ${text}`;
                const result = await Utils.withTimeout(
                    writer.write(prompt),
                    10000 // 10 second timeout
                );
                await writer.destroy();

                return result;
            } catch (error) {
                console.error('Writer API error:', error);
                return null;
            }
        },

        async extractKeyPoints(text) {
            if (!AppState.chromeAI.summarizer) {
                return null;
            }

            try {
                const summarizer = await window.ai.summarizer.create({
                    type: 'key-points',
                    format: 'bullet-points',
                    length: 'short'
                });

                const summary = await Utils.withTimeout(
                    summarizer.summarize(text),
                    10000 // 10 second timeout
                );
                await summarizer.destroy();

                // Parse bullet points
                return summary.split('\n')
                    .filter(line => line.trim().length > 0)
                    .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
                    .slice(0, 5);
            } catch (error) {
                console.error('Summarizer API error:', error);
                return null;
            }
        },

        // ============================================
        // ENHANCED FEATURES - Chrome AI Only
        // ============================================

        /**
         * Generate multiple summary types using Summarizer API
         * Only works when Chrome AI is available
         */
        async generateMultipleSummaries(text, documentType) {
            if (!AppState.chromeAI.summarizer) {
                return null;
            }

            const summaries = {};

            try {
                // 1. Headline Summary (Single sentence summary)
                try {
                    const headlineSummarizer = await window.ai.summarizer.create({
                        type: 'headline',
                        format: 'plain-text',
                        length: 'short',
                        sharedContext: `This is a ${documentType} document`
                    });
                    summaries.headline = await Utils.withTimeout(
                        headlineSummarizer.summarize(text),
                        10000
                    );
                    await headlineSummarizer.destroy();
                } catch (error) {
                    console.error('Headline summary failed:', error);
                    summaries.headline = null;
                }

                // 2. TL;DR (Quick overview)
                try {
                    const tldrSummarizer = await window.ai.summarizer.create({
                        type: 'tldr',
                        format: 'plain-text',
                        length: 'medium'
                    });
                    summaries.tldr = await Utils.withTimeout(
                        tldrSummarizer.summarize(text),
                        10000
                    );
                    await tldrSummarizer.destroy();
                } catch (error) {
                    console.error('TL;DR summary failed:', error);
                    summaries.tldr = null;
                }

                // 3. Teaser (Intriguing highlights)
                try {
                    const teaserSummarizer = await window.ai.summarizer.create({
                        type: 'teaser',
                        format: 'plain-text',
                        length: 'medium'
                    });
                    summaries.teaser = await Utils.withTimeout(
                        teaserSummarizer.summarize(text),
                        10000
                    );
                    await teaserSummarizer.destroy();
                } catch (error) {
                    console.error('Teaser summary failed:', error);
                    summaries.teaser = null;
                }

                // 4. Key Points (Already implemented, reuse)
                try {
                    const keyPoints = await this.extractKeyPoints(text);
                    summaries.keyPoints = keyPoints;
                } catch (error) {
                    console.error('Key points extraction failed:', error);
                    summaries.keyPoints = null;
                }

                console.log('Generated summaries using Summarizer API');
                return summaries;
            } catch (error) {
                console.error('Multi-summary generation failed:', error);
                return null;
            }
        },

        /**
         * Process text with streaming for real-time feedback
         * Only works when Language Model API is available
         */
        async processTextWithStreaming(text, documentType, complexityLevel, outputElement) {
            if (!this.sessions.languageModel && !AppState.chromeAI.languageModel) {
                return null;
            }

            try {
                // Session should already be created in init()
                if (!this.sessions.languageModel) {
                    console.error('Language Model session not initialized');
                    return null;
                }

                const prompt = this.buildStreamingPrompt(text, documentType, complexityLevel);

                // Clear output element for streaming
                if (outputElement) {
                    outputElement.textContent = '';
                }

                let fullResponse = '';

                // Use streaming API
                const stream = await this.sessions.languageModel.promptStreaming(prompt);

                for await (const chunk of stream) {
                    fullResponse = chunk;
                    if (outputElement) {
                        outputElement.textContent = chunk;
                        // Auto-scroll to show latest content
                        outputElement.scrollTop = outputElement.scrollHeight;
                    }
                }

                console.log('✅ Streaming complete');
                return fullResponse;
            } catch (error) {
                console.error('Streaming failed:', error);
                return null;
            }
        },

        buildStreamingPrompt(text, documentType, complexityLevel) {
            const levels = {
                simple: 'Explain this as if teaching a 10-year-old child. Use very simple words and short sentences (maximum 12 words per sentence). Break complex ideas into multiple simple sentences.',
                standard: 'Rewrite this for a high school student. Use clear language and moderate sentence length (maximum 20 words per sentence). Avoid jargon.',
                educated: 'Clarify this for a college-educated adult. Maintain precision while improving clarity. Use professional but accessible language.'
            };

            const domains = {
                legal: 'This is a legal document. Remove legal jargon and explain what it actually means in plain language.',
                medical: 'This is medical information. Replace medical terminology with patient-friendly language.',
                technical: 'This is technical documentation. Explain it for non-technical readers without losing accuracy.',
                academic: 'This is academic text. Make it accessible to general readers while preserving scholarly content.',
                financial: 'This is financial information. Explain it in everyday terms that anyone can understand.',
                auto: 'Simplify and clarify this text while preserving all important information.'
            };

            return `${domains[documentType]} ${levels[complexityLevel]}\n\nOriginal text:\n${text}\n\nSimplified version:`;
        },

        /**
         * Process text at all 3 complexity levels for comparison
         * Only works when Chrome AI is available
         */
        async processAllComplexityLevels(text, documentType) {
            const levels = ['simple', 'standard', 'educated'];
            const results = {};

            try {
                // Process all levels in parallel for speed
                const promises = levels.map(async (level) => {
                    const result = await this.processText(text, documentType, level);
                    return { level, result };
                });

                const outputs = await Promise.all(promises);

                outputs.forEach(({ level, result }) => {
                    if (result && result.text) {
                        results[level] = result.text;
                    }
                });

                console.log('✅ Generated outputs for all 3 complexity levels');
                return Object.keys(results).length === 3 ? results : null;
            } catch (error) {
                console.error('Multi-level processing failed:', error);
                return null;
            }
        },

        /**
         * Process audio file using multimodal Prompt API
         * Transcribes and simplifies audio content
         * Only works when Language Model API with multimodal support is available
         */
        async processAudioDocument(audioFile, documentType, complexityLevel) {
            if (!this.sessions.languageModel && !AppState.chromeAI.languageModel) {
                return null;
            }

            try {
                // Create session if needed
                if (!this.sessions.languageModel) {
                    this.sessions.languageModel = await window.ai.languageModel.create({
                        systemPrompt: 'You are an expert at transcribing and simplifying audio content.',
                        temperature: 0.7,
                        topK: 40
                    });
                }

                // Convert audio file to ArrayBuffer
                const arrayBuffer = await audioFile.arrayBuffer();

                const prompt = this.buildStreamingPrompt(
                    'Transcribe this audio and then simplify it.',
                    documentType,
                    complexityLevel
                );

                // Process with multimodal input
                const result = await this.sessions.languageModel.prompt(prompt, {
                    audio: arrayBuffer
                });

                console.log('✅ Audio document processed using multimodal Prompt API');
                return result;
            } catch (error) {
                console.error('Audio processing failed:', error);
                return null;
            }
        },

        /**
         * Process image document using multimodal Prompt API
         * Extracts text from images and simplifies
         * Only works when Language Model API with multimodal support is available
         */
        async processImageDocument(imageFile, documentType, complexityLevel) {
            if (!this.sessions.languageModel && !AppState.chromeAI.languageModel) {
                return null;
            }

            try {
                // Create session if needed
                if (!this.sessions.languageModel) {
                    this.sessions.languageModel = await window.ai.languageModel.create({
                        systemPrompt: 'You are an expert at extracting and simplifying text from images.',
                        temperature: 0.7,
                        topK: 40
                    });
                }

                // Convert image file to ArrayBuffer
                const arrayBuffer = await imageFile.arrayBuffer();

                const prompt = `Extract all text from this image (it may be a screenshot, PDF page, or photo of a document). Then simplify the extracted text to ${complexityLevel} reading level for a ${documentType} document. Provide only the simplified text.`;

                // Process with multimodal input
                const result = await this.sessions.languageModel.prompt(prompt, {
                    image: arrayBuffer
                });

                console.log('✅ Image document processed using multimodal Prompt API');
                return result;
            } catch (error) {
                console.error('Image processing failed:', error);
                return null;
            }
        },

        /**
         * Cleanup all active sessions
         * Called on page unload to prevent memory leaks
         */
        cleanup() {
            console.log('Cleaning up Chrome AI sessions...');
            Object.keys(this.sessions).forEach(key => {
                if (this.sessions[key]?.destroy) {
                    try {
                        this.sessions[key].destroy();
                        console.log(`Destroyed ${key} session`);
                    } catch (error) {
                        console.error(`Failed to destroy ${key} session:`, error);
                    }
                }
                this.sessions[key] = null;
            });
        }
    };

    // Fallback Text Processing Engine
    const FallbackEngine = {
        // Complexity-aware jargon maps for different reading levels
        jargonMaps: {
            simple: {
                // Maximum simplification for elementary level (Age 10)
                // Legal
                'pursuant to': 'based on',
                'heretofore': 'until now',
                'aforementioned': 'this',
                'notwithstanding': 'even though',
                'whereas': 'because',
                'thereby': 'so',
                'herein': 'here',
                'ipso facto': 'automatically',
                'breach': 'breaking the deal',
                'liability': 'being responsible',

                // Medical
                'myocardial infarction': 'heart attack',
                'cerebrovascular accident': 'stroke',
                'hypertension': 'high blood pressure',
                'hypotension': 'low blood pressure',
                'tachycardia': 'fast heartbeat',
                'dyspnea': 'trouble breathing',
                'contraindicated': 'not safe to use',
                'prophylactic': 'to prevent',
                'etiology': 'cause',
                'prognosis': 'what will happen',

                // Technical
                'utilize': 'use',
                'implement': 'do',
                'optimize': 'make better',
                'facilitate': 'help',
                'methodology': 'way',
                'infrastructure': 'basic systems',
                'architecture': 'structure',
                'authenticate': 'prove who you are',
                'authorization': 'permission',

                // Academic
                'elucidate': 'explain',
                'substantiate': 'prove',
                'hypothesis': 'guess',
                'empirical': 'tested',
                'paradigm': 'way of thinking',
                'methodology': 'way of doing',

                // Financial
                'amortization': 'paying slowly',
                'liquidity': 'cash available',
                'volatility': 'price changes',
                'equity': 'ownership'
            },

            standard: {
                // Moderate simplification for high school level
                // Legal
                'pursuant to': 'according to',
                'heretofore': 'until now',
                'aforementioned': 'mentioned earlier',
                'notwithstanding': 'despite',
                'whereas': 'while',
                'thereby': 'by doing this',
                'herein': 'in this document',
                'ipso facto': 'by that fact',
                'breach': 'breaking the agreement',
                'liability': 'legal responsibility',

                // Medical
                'myocardial infarction': 'heart attack',
                'cerebrovascular accident': 'stroke',
                'hypertension': 'high blood pressure',
                'hypotension': 'low blood pressure',
                'tachycardia': 'fast heart rate',
                'dyspnea': 'difficulty breathing',
                'contraindicated': 'not recommended',
                'prophylactic': 'preventive',
                'etiology': 'cause',
                'prognosis': 'expected outcome',

                // Technical
                'utilize': 'use',
                'implement': 'put in place',
                'optimize': 'improve',
                'facilitate': 'make easier',
                'methodology': 'method',
                'infrastructure': 'basic systems',
                'architecture': 'system design',
                'authenticate': 'verify identity',
                'authorization': 'access permission',

                // Academic
                'elucidate': 'explain clearly',
                'substantiate': 'support with evidence',
                'hypothesis': 'theory to test',
                'empirical': 'based on observation',
                'paradigm': 'framework',
                'methodology': 'research method',

                // Financial
                'amortization': 'gradual payment',
                'liquidity': 'available cash',
                'volatility': 'price instability',
                'equity': 'ownership value'
            },

            educated: {
                // Minimal simplification for college level - keep precision
                // Legal
                'pursuant to': 'in accordance with',
                'heretofore': 'up to this point',
                'aforementioned': 'previously mentioned',
                'notwithstanding': 'regardless of',
                'whereas': 'given that',
                'thereby': 'by means of which',
                'herein': 'within this document',
                'ipso facto': 'by the very fact',
                'breach': 'contract violation',
                'liability': 'legal obligation',

                // Medical
                'myocardial infarction': 'heart muscle damage',
                'cerebrovascular accident': 'brain blood flow disruption',
                'hypertension': 'elevated blood pressure',
                'hypotension': 'reduced blood pressure',
                'tachycardia': 'elevated heart rate',
                'dyspnea': 'respiratory difficulty',
                'contraindicated': 'medically inadvisable',
                'prophylactic': 'preventive treatment',
                'etiology': 'underlying cause',
                'prognosis': 'clinical outlook',

                // Technical - keep most terms as professionals use them
                'utilize': 'utilize',
                'implement': 'implement',
                'optimize': 'optimize',
                'facilitate': 'enable',
                'methodology': 'systematic approach',
                'infrastructure': 'foundational architecture',
                'architecture': 'system architecture',
                'authenticate': 'verify credentials',
                'authorization': 'access control',

                // Academic - keep terminology
                'elucidate': 'clarify',
                'substantiate': 'provide evidence for',
                'hypothesis': 'testable proposition',
                'empirical': 'observation-based',
                'paradigm': 'conceptual framework',
                'methodology': 'research methodology',

                // Financial
                'amortization': 'systematic repayment',
                'liquidity': 'asset convertibility',
                'volatility': 'price variability',
                'equity': 'ownership interest'
            }
        },

        // Legacy combined map for reference (can be removed)
        jargonMap: {
            // Legal (50+ terms)
            'pursuant to': 'according to',
            'heretofore': 'until now',
            'hereinafter': 'from now on',
            'aforementioned': 'mentioned above',
            'notwithstanding': 'despite',
            'whereas': 'while',
            'whereby': 'where',
            'thereby': 'by doing this',
            'herein': 'in this document',
            'therein': 'in that',
            'hereunder': 'under this',
            'thereunder': 'under that',
            'forthwith': 'immediately',
            'ipso facto': 'by that fact',
            'inter alia': 'among other things',
            'prima facie': 'at first glance',
            'res ipsa loquitur': 'the facts speak for themselves',
            'habeas corpus': 'right to fair trial',
            'ex parte': 'from one side only',
            'in camera': 'in private',
            'sua sponte': 'on its own',
            'amicus curiae': 'friend of the court',
            'sine qua non': 'essential requirement',
            'ultra vires': 'beyond authority',
            'force majeure': 'unforeseeable circumstances',
            'estoppel': 'legal prevention',
            'tort': 'wrongful act',
            'negligence per se': 'obvious negligence',
            'proximate cause': 'direct cause',
            'consideration': 'payment or benefit',
            'breach': 'breaking the agreement',
            'remedy': 'fix or compensation',
            'liquidated damages': 'agreed penalty amount',
            'indemnification': 'protection from loss',
            'subpoena': 'court order to appear',
            'deposition': 'sworn testimony',
            'injunction': 'court order to stop',
            'plaintiff': 'person suing',
            'defendant': 'person being sued',
            'litigant': 'person in lawsuit',
            'appellant': 'person appealing',
            'appellee': 'person being appealed against',
            'jurisdiction': 'court authority',
            'venue': 'court location',
            'statute of limitations': 'time limit to sue',
            'due process': 'fair legal procedure',
            'fiduciary duty': 'responsibility to act in best interest',
            'power of attorney': 'legal authority to act for someone',
            'quid pro quo': 'something for something',
            'caveat emptor': 'buyer beware',
            'de facto': 'in reality',
            'de jure': 'by law',

            // Medical (60+ terms)
            'contraindicated': 'not recommended',
            'asymptomatic': 'without symptoms',
            'prophylactic': 'preventive',
            'etiology': 'cause',
            'prognosis': 'outlook',
            'exacerbation': 'worsening',
            'amelioration': 'improvement',
            'pathophysiology': 'how the disease works',
            'comorbidity': 'other health problems',
            'differential diagnosis': 'other possible conditions',
            'myocardial infarction': 'heart attack',
            'cerebrovascular accident': 'stroke',
            'hypertension': 'high blood pressure',
            'hypotension': 'low blood pressure',
            'tachycardia': 'fast heart rate',
            'bradycardia': 'slow heart rate',
            'dyspnea': 'difficulty breathing',
            'epistaxis': 'nosebleed',
            'syncope': 'fainting',
            'vertigo': 'dizziness',
            'pneumonia': 'lung infection',
            'gastroenteritis': 'stomach flu',
            'dermatitis': 'skin inflammation',
            'arthritis': 'joint inflammation',
            'nephritis': 'kidney inflammation',
            'hepatitis': 'liver inflammation',
            'laparoscopy': 'keyhole surgery',
            'endoscopy': 'internal examination with camera',
            'biopsy': 'tissue sample test',
            'angioplasty': 'artery opening procedure',
            'catheterization': 'tube insertion',
            'analgesic': 'pain reliever',
            'antibiotic': 'infection fighter',
            'diuretic': 'water pill',
            'anticoagulant': 'blood thinner',
            'bronchodilator': 'breathing helper',
            'cardiovascular': 'heart and blood vessels',
            'respiratory': 'breathing system',
            'gastrointestinal': 'digestive system',
            'neurological': 'nervous system',
            'pulmonary': 'lung system',
            'orthopedic': 'bone and joint',
            'ophthalmologic': 'eye-related',
            'otolaryngologic': 'ear, nose, throat',
            'dermatologic': 'skin-related',
            'psychiatric': 'mental health',
            'oncologic': 'cancer-related',
            'hematologic': 'blood-related',
            'endocrine': 'hormone system',
            'immunologic': 'immune system',
            'renal': 'kidney-related',
            'hepatic': 'liver-related',
            'cardiac': 'heart-related',
            'pulmonary embolism': 'blood clot in lung',
            'deep vein thrombosis': 'blood clot in leg vein',
            'atrial fibrillation': 'irregular heartbeat',
            'congestive heart failure': 'weak heart muscle',
            'chronic obstructive pulmonary disease': 'breathing disease',
            'diabetes mellitus': 'blood sugar disease',
            'hypertensive': 'high blood pressure patient',
            'hyperlipidemia': 'high cholesterol',

            // Technical (70+ terms)
            'utilize': 'use',
            'implement': 'create',
            'leverage': 'use',
            'optimize': 'improve',
            'facilitate': 'help',
            'methodology': 'method',
            'infrastructure': 'basic systems',
            'architecture': 'structure',
            'instantiate': 'create',
            'deprecated': 'no longer supported',
            'microservices': 'small independent services',
            'monolithic': 'single large application',
            'containerization': 'packaging applications',
            'orchestration': 'managing multiple containers',
            'load balancing': 'distributing traffic',
            'caching': 'storing frequently used data',
            'sharding': 'splitting data across servers',
            'replication': 'copying data for backup',
            'refactoring': 'improving code structure',
            'debugging': 'finding and fixing errors',
            'deployment': 'releasing software',
            'integration': 'combining systems',
            'authentication': 'verifying user identity',
            'authorization': 'granting permissions',
            'encryption': 'protecting data with codes',
            'API': 'application programming interface',
            'SDK': 'software development kit',
            'framework': 'pre-built code foundation',
            'firewall': 'security barrier',
            'VPN': 'virtual private network',
            'SSL': 'secure connection',
            'TLS': 'secure connection',
            'DDoS': 'overwhelming attack',
            'phishing': 'fake identity theft',
            'malware': 'harmful software',
            'ransomware': 'data-locking virus',
            'middleware': 'connecting software',
            'database': 'data storage system',
            'repository': 'code storage location',
            'version control': 'code change tracking',
            'continuous integration': 'automatic code testing',
            'continuous deployment': 'automatic code release',
            'agile development': 'flexible work method',
            'scrum': 'team work framework',
            'sprint': 'short work period',
            'backlog': 'work to be done list',
            'user story': 'feature description',
            'acceptance criteria': 'completion requirements',
            'technical debt': 'code quality shortcuts',
            'scalability': 'ability to handle growth',
            'latency': 'response delay',
            'throughput': 'processing capacity',
            'bandwidth': 'data transfer capacity',
            'redundancy': 'backup systems',
            'failover': 'automatic backup switching',
            'rollback': 'reverting to previous version',
            'configuration': 'system settings',
            'environment': 'system setup',
            'staging': 'testing environment',
            'production': 'live environment',
            'virtualization': 'simulated computer systems',
            'cloud computing': 'internet-based computing',
            'SaaS': 'software as a service',
            'PaaS': 'platform as a service',
            'IaaS': 'infrastructure as a service',
            'DevOps': 'development and operations combined',
            'CI/CD': 'continuous integration and deployment',
            'REST': 'web service standard',
            'GraphQL': 'data query language',
            'JSON': 'data format',
            'XML': 'data format',
            'HTTP': 'web protocol',
            'HTTPS': 'secure web protocol',
            'OAuth': 'authorization standard',
            'JWT': 'security token',

            // Academic (40+ terms)
            'elucidate': 'explain',
            'substantiate': 'prove',
            'corroborate': 'confirm',
            'extrapolate': 'extend',
            'paradigm': 'model',
            'hypothesis': 'theory',
            'empirical': 'based on observation',
            'ubiquitous': 'everywhere',
            'salient': 'important',
            'albeit': 'although',
            'methodology': 'research method',
            'epistemology': 'study of knowledge',
            'ontology': 'study of existence',
            'phenomenology': 'study of experience',
            'hermeneutics': 'study of interpretation',
            'dialectical': 'through discussion',
            'synthesis': 'combination',
            'antithesis': 'opposite',
            'dichotomy': 'division into two',
            'taxonomy': 'classification system',
            'typology': 'category system',
            'theoretical framework': 'guiding theory',
            'conceptual model': 'idea structure',
            'literature review': 'research summary',
            'meta-analysis': 'study of studies',
            'systematic review': 'thorough research review',
            'peer review': 'expert evaluation',
            'longitudinal study': 'long-term study',
            'cross-sectional study': 'snapshot study',
            'qualitative research': 'descriptive research',
            'quantitative research': 'numerical research',
            'mixed methods': 'combined research approach',
            'sample size': 'number of participants',
            'population': 'entire group studied',
            'correlation': 'relationship',
            'causation': 'cause and effect',
            'statistical significance': 'meaningful difference',
            'confidence interval': 'range of certainty',
            'regression analysis': 'prediction method',
            'control group': 'comparison group',
            'experimental group': 'treatment group',
            'randomized controlled trial': 'gold standard study',

            // Financial (30+ terms)
            'amortization': 'gradual payment',
            'collateral': 'security',
            'liquidity': 'available cash',
            'portfolio': 'investments',
            'diversification': 'spreading risk',
            'volatility': 'price changes',
            'equity': 'ownership value',
            'liability': 'debt',
            'receivables': 'money owed to us',
            'payables': 'money we owe',
            'arbitrage': 'profit from price differences',
            'yield': 'return on investment',
            'derivative': 'contract based on other assets',
            'hedge': 'protection against loss',
            'principal': 'original loan amount',
            'compound interest': 'interest earning interest',
            'escrow': 'third-party holding',
            'underwriting': 'risk assessment',
            'fiduciary': 'acting in your best interest',
            'EBITDA': 'earnings before interest, taxes, depreciation, amortization',
            'cash flow': 'money in and out',
            'working capital': 'short-term funds',
            'accounts receivable': 'money customers owe',
            'accounts payable': 'money we owe suppliers',
            'balance sheet': 'financial snapshot',
            'income statement': 'profit and loss report',
            'cash flow statement': 'money movement report',
            'asset': 'valuable item owned',
            'depreciation': 'value decrease over time',
            'appreciation': 'value increase over time',
            'dividend': 'profit sharing payment',
            'capital gains': 'profit from selling investments',
            'market capitalization': 'company total value',
            'IPO': 'initial public offering',
            'merger': 'company combination',
            'acquisition': 'company purchase'
        },

        complexPhrases: {
            'in order to': 'to',
            'due to the fact that': 'because',
            'at this point in time': 'now',
            'in the event that': 'if',
            'with regard to': 'about',
            'with respect to': 'about',
            'in connection with': 'about',
            'for the purpose of': 'to',
            'in accordance with': 'following',
            'with the exception of': 'except for',
            'subsequent to': 'after',
            'prior to': 'before',
            'in lieu of': 'instead of',
            'by virtue of': 'because of',
            'in consideration of': 'because of'
        },

        process(text, documentType, complexityLevel) {
            let result = text;

            // Step 1: Apply complexity-aware jargon replacement
            result = this.replaceJargon(result, documentType, complexityLevel);

            // Step 2: Simplify complex phrases
            result = this.simplifyPhrases(result);

            // Step 3: Break long sentences based on complexity level
            result = this.breakLongSentences(result, complexityLevel);

            // Step 4: Simplify sentence structure
            result = this.simplifyStructure(result, complexityLevel);

            // Step 5: Clean up formatting
            result = this.cleanFormatting(result);

            return result;
        },

        // Pattern-based processing for unknown terms
        suffixPatterns: {
            'itis': 'inflammation',
            'osis': 'condition',
            'emia': 'blood condition',
            'algia': 'pain',
            'ology': 'study of',
            'ization': 'process of',
            'ification': 'making into',
            'ectomy': 'surgical removal',
            'otomy': 'cutting into',
            'scopy': 'examination with instrument'
        },

        prefixPatterns: {
            'hyper': 'above normal',
            'hypo': 'below normal',
            'anti': 'against',
            'pre': 'before',
            'post': 'after',
            'inter': 'between',
            'intra': 'within',
            'extra': 'outside',
            'sub': 'under',
            'super': 'above',
            'multi': 'many',
            'uni': 'one',
            'bi': 'two',
            'tri': 'three'
        },

        replaceJargon(text, documentType, complexityLevel) {
            let result = text;

            // Step 1: Apply complexity-specific jargon replacement
            const selectedJargonMap = this.jargonMaps[complexityLevel] || this.jargonMaps.standard;

            Object.keys(selectedJargonMap).forEach(jargon => {
                const regex = new RegExp(`\\b${jargon}\\b`, 'gi');
                result = result.replace(regex, selectedJargonMap[jargon]);
            });

            // Step 2: Apply pattern-based processing for unknown terms
            result = this.applyPatternProcessing(result);

            return result;
        },

        applyPatternProcessing(text) {
            let result = text;

            // Process suffix patterns
            Object.keys(this.suffixPatterns).forEach(suffix => {
                const pattern = new RegExp(`\\b(\\w+)${suffix}\\b`, 'gi');
                result = result.replace(pattern, (match, root) => {
                    return `${root} ${this.suffixPatterns[suffix]}`;
                });
            });

            // Process prefix patterns
            Object.keys(this.prefixPatterns).forEach(prefix => {
                const pattern = new RegExp(`\\b${prefix}(\\w+)\\b`, 'gi');
                result = result.replace(pattern, (match, root) => {
                    return `${this.prefixPatterns[prefix]} ${root}`;
                });
            });

            return result;
        },

        simplifyPhrases(text) {
            let result = text;

            Object.keys(this.complexPhrases).forEach(phrase => {
                const regex = new RegExp(phrase, 'gi');
                result = result.replace(regex, this.complexPhrases[phrase]);
            });

            return result;
        },

        breakLongSentences(text, complexityLevel) {
            const maxLength = {
                simple: 12,    // Elementary: very short sentences
                standard: 18,  // High school: moderate sentences
                educated: 25   // College: longer sentences OK
            };

            const breakWords = {
                simple: [', and', ', but', ', so', ', then'],      // Simple connectors
                standard: [', and', ', but', ', or', '; ', ' because', ' when', ' where'],  // More variety
                educated: [', and', ', but', ', or', '; ', ' because', ' when', ' where', ' which', ' that', ' while', ' although']  // Complex connectors
            };

            const sentences = text.split(/(?<=[.!?])\s+/);

            return sentences.map(sentence => {
                const words = sentence.split(' ');

                if (words.length > maxLength[complexityLevel]) {
                    // Use complexity-appropriate break words
                    const currentBreakWords = breakWords[complexityLevel];

                    for (let breakWord of currentBreakWords) {
                        if (sentence.includes(breakWord)) {
                            // For simple level, add transition words
                            if (complexityLevel === 'simple') {
                                if (breakWord === ', and') return sentence.replace(breakWord, '. Also,');
                                if (breakWord === ', but') return sentence.replace(breakWord, '. However,');
                                if (breakWord === ', so') return sentence.replace(breakWord, '. Therefore,');
                                return sentence.replace(breakWord, '. ');
                            } else {
                                return sentence.replace(breakWord, '. ');
                            }
                        }
                    }

                    // If no natural break found, break at comma with complexity-appropriate handling
                    const commaIndex = sentence.indexOf(',', Math.floor(sentence.length / 2));
                    if (commaIndex > 0) {
                        const firstPart = sentence.substring(0, commaIndex);
                        const secondPart = sentence.substring(commaIndex + 1).trim();

                        // For simple level, ensure the break makes sense
                        if (complexityLevel === 'simple') {
                            return firstPart + '. ' + secondPart.charAt(0).toUpperCase() + secondPart.slice(1);
                        } else {
                            return firstPart + '. ' + secondPart;
                        }
                    }
                }

                return sentence;
            }).join(' ');
        },

        simplifyStructure(text, complexityLevel) {
            let result = text;

            // Convert passive voice to active (basic patterns)
            const passivePatterns = [
                { pattern: /(\w+) was (\w+ed) by (\w+)/gi, replacement: '$3 $2 $1' },
                { pattern: /(\w+) is (\w+ed) by (\w+)/gi, replacement: '$3 $2s $1' }
            ];

            passivePatterns.forEach(({pattern, replacement}) => {
                result = result.replace(pattern, replacement);
            });

            // Simplify conditionals for elementary level
            if (complexityLevel === 'simple') {
                result = result.replace(/if and only if/gi, 'only if');
                result = result.replace(/provided that/gi, 'if');
                result = result.replace(/unless and until/gi, 'until');
            }

            return result;
        },

        cleanFormatting(text) {
            return text
                .replace(/\s+/g, ' ')           // Multiple spaces to single
                .replace(/\.\s*\./g, '.')       // Double periods
                .replace(/,\s*,/g, ',')         // Double commas
                .replace(/^\s+|\s+$/g, '')      // Trim
                .replace(/([.!?])\s*([a-z])/g, '$1 $2'); // Ensure space after punctuation
        },

        extractKeyPoints(text) {
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
            const keyPoints = [];

            // Enhanced importance markers by domain
            const importanceMarkers = {
                general: ['important', 'must', 'required', 'critical', 'essential', 'necessary', 'key', 'main', 'primary', 'significant', 'major', 'crucial'],
                legal: ['shall', 'will', 'should', 'obligation', 'responsibility', 'liable', 'breach', 'violation', 'penalty', 'damages', 'rights', 'duties'],
                medical: ['diagnosis', 'treatment', 'symptoms', 'condition', 'risk', 'side effects', 'contraindicated', 'recommended', 'dosage', 'prognosis'],
                technical: ['requirements', 'specifications', 'limitations', 'performance', 'security', 'compatibility', 'version', 'deprecated', 'support'],
                financial: ['cost', 'price', 'fee', 'payment', 'interest', 'return', 'risk', 'investment', 'liability', 'asset', 'revenue', 'profit'],
                academic: ['hypothesis', 'conclusion', 'findings', 'results', 'methodology', 'analysis', 'evidence', 'theory', 'research', 'study']
            };

            // Structural markers for key information
            const structuralMarkers = [
                'first', 'second', 'third', 'finally', 'in conclusion', 'summary', 'overview', 'definition', 'example',
                'note that', 'please note', 'warning', 'caution', 'attention', 'remember', 'keep in mind'
            ];

            // Question words that often indicate important information
            const questionMarkers = ['what', 'when', 'where', 'who', 'why', 'how', 'which'];

            // Score sentences by multiple factors
            const scoredSentences = sentences.map(sentence => {
                let score = 0;
                const lowerSentence = sentence.toLowerCase();
                const position = sentences.indexOf(sentence);

                // Factor 1: Importance markers (weighted by domain relevance)
                Object.values(importanceMarkers).flat().forEach(marker => {
                    if (lowerSentence.includes(marker)) {
                        score += 3;
                    }
                });

                // Factor 2: Structural markers
                structuralMarkers.forEach(marker => {
                    if (lowerSentence.includes(marker)) {
                        score += 2;
                    }
                });

                // Factor 3: Question markers
                questionMarkers.forEach(marker => {
                    if (lowerSentence.includes(marker)) {
                        score += 1;
                    }
                });

                // Factor 4: Position bias (first and last sentences are often important)
                if (position === 0) score += 3; // First sentence
                if (position === sentences.length - 1) score += 2; // Last sentence
                if (position < 3) score += 1; // Early sentences

                // Factor 5: Length bias (informative sentences are often longer)
                if (sentence.length > 100) score += 1;
                if (sentence.length > 200) score += 1;

                // Factor 6: Numbers and dates (often contain key facts)
                if (/\d+/.test(sentence)) score += 1;
                if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(sentence)) score += 1; // Date patterns

                // Factor 7: Capitalized terms (often proper nouns or important concepts)
                const capitalizedWords = sentence.match(/\b[A-Z][a-z]+\b/g) || [];
                if (capitalizedWords.length > 3) score += 1;

                // Factor 8: Punctuation indicating emphasis
                if (sentence.includes('!')) score += 1;
                if (sentence.includes(':')) score += 1; // Often introduces important info

                // Factor 9: Penalty for very short or very long sentences
                if (sentence.length < 50) score -= 1;
                if (sentence.length > 300) score -= 1;

                return { sentence: sentence.trim(), score, length: sentence.length, position };
            });

            // Sort by score (descending) and take top candidates
            scoredSentences
                .sort((a, b) => b.score - a.score)
                .slice(0, 8) // Take more candidates initially
                .forEach(item => {
                    if (item.sentence.length > 0 && keyPoints.length < 5) {
                        // Additional filtering: avoid very similar sentences
                        const isDuplicate = keyPoints.some(existing => {
                            const similarity = this.calculateSimilarity(existing, item.sentence);
                            return similarity > 0.7; // 70% similarity threshold
                        });

                        if (!isDuplicate) {
                            keyPoints.push(item.sentence);
                        }
                    }
                });

            return keyPoints;
        },

        // Simple similarity calculation to avoid duplicate key points
        calculateSimilarity(str1, str2) {
            const words1 = str1.toLowerCase().split(/\s+/);
            const words2 = str2.toLowerCase().split(/\s+/);
            const intersection = words1.filter(word => words2.includes(word));
            const union = [...new Set([...words1, ...words2])];
            return intersection.length / union.length;
        }
    };

    // Main Application Controller
    const ClariaApp = {
        elements: {},

        async init() {
            console.log('🚀 Initializing Claria...');

            // Cache DOM elements
            this.cacheElements();

            // Initialize Chrome AI
            await this.initializeAI();

            // Setup event listeners
            this.setupEventListeners();

            // Load examples
            this.loadExamples();

            // Set initial state
            this.updateUI();

            console.log('✅ Claria initialized successfully');
        },

        cacheElements() {
            this.elements = {
                // Input elements
                input: document.getElementById('input'),
                charCount: document.getElementById('char-count'),
                clarifyBtn: document.getElementById('clarify-btn'),

                // Type buttons
                typeButtons: document.querySelectorAll('.type-pill'),
                levelRadios: document.querySelectorAll('input[name="level"]'),

                // Example buttons
                exampleButtons: document.querySelectorAll('.example-btn'),

                // Processing
                processing: document.getElementById('processing'),
                processingText: document.getElementById('processing-text'),

                // Output
                outputSection: document.getElementById('output-section'),
                output: document.getElementById('output'),

                // Actions
                copyBtn: document.getElementById('copy-btn'),
                downloadBtn: document.getElementById('download-btn'),
                speakBtn: document.getElementById('speak-btn'),

                // Metrics
                originalLength: document.getElementById('original-length'),
                clarifiedLength: document.getElementById('clarified-length'),
                processingTime: document.getElementById('processing-time'),
                aiEngine: document.getElementById('ai-engine'),

                // Key points
                keypointsList: document.getElementById('keypoints-list'),

                // Comparison
                originalDisplay: document.getElementById('original-display'),
                clarifiedDisplay: document.getElementById('clarified-display'),

                // Status
                aiStatus: document.getElementById('ai-status'),
                statusText: document.getElementById('status-text'),
                appStatus: document.getElementById('app-status')
            };
        },

        async initializeAI() {
            this.updateStatus('Initializing Chrome AI...', 'loading');

            try {
                const capabilities = await ChromeAI.init();
                const availableAPIs = Object.values(capabilities).filter(Boolean).length;

                if (availableAPIs > 0) {
                    AppState.mode = 'chrome-ai';
                    this.updateStatus(`Chrome AI Active (${availableAPIs}/4 APIs)`, 'success');
                } else {
                    AppState.mode = 'fallback';
                    this.updateStatus('Enhanced Mode (Fallback Engine)', 'fallback');
                }
            } catch (error) {
                console.error('AI initialization error:', error);
                AppState.mode = 'fallback';
                this.updateStatus('Enhanced Mode (Fallback Engine)', 'fallback');
            }
        },

        setupEventListeners() {
            // Main clarify button
            this.elements.clarifyBtn.addEventListener('click', () => {
                this.handleClarify();
            });

            // Document type buttons
            this.elements.typeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.handleTypeChange(e.target);
                });
            });

            // Complexity level radios
            this.elements.levelRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    AppState.complexityLevel = e.target.value;
                    // Update visual states
                    document.querySelectorAll('.complexity-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    e.target.closest('.complexity-card').classList.add('selected');
                });
            });

            // Example buttons
            this.elements.exampleButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.loadExample(e.target.dataset.example);
                });
            });

            // Input handling with debounced character counter
            this.elements.input.addEventListener('input',
                Utils.debounce((e) => {
                    this.updateCharCount(e.target.value.length);
                }, 100)
            );

            // Copy button
            this.elements.copyBtn?.addEventListener('click', () => {
                this.copyToClipboard();
            });

            // Download button
            this.elements.downloadBtn?.addEventListener('click', () => {
                this.downloadText();
            });

            // Speak button
            this.elements.speakBtn?.addEventListener('click', () => {
                this.speakText();
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + Enter to clarify
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.handleClarify();
                }

                // Escape to stop speech
                if (e.key === 'Escape') {
                    speechSynthesis.cancel();
                }
            });

            // Auto-resize textarea
            this.elements.input.addEventListener('input', () => {
                this.autoResizeTextarea();
            });

            // ===== ENHANCED FEATURES: File Upload Handlers (Chrome AI only) =====

            // Audio file upload handler
            const audioUpload = document.getElementById('audio-upload');
            if (audioUpload) {
                audioUpload.addEventListener('change', async (e) => {
                    await this.handleAudioUpload(e);
                });
            }

            // Image file upload handler
            const imageUpload = document.getElementById('image-upload');
            if (imageUpload) {
                imageUpload.addEventListener('change', async (e) => {
                    await this.handleImageUpload(e);
                });
            }
        },

        handleTypeChange(button) {
            // Update button states
            this.elements.typeButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });

            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');

            // Update state
            AppState.documentType = button.dataset.type;
        },

        async handleClarify() {
            const input = this.elements.input.value.trim();

            if (!input) {
                alert('Please enter some text to clarify');
                return;
            }

            if (input.length < 10) {
                alert('Text too short. Please enter at least 10 characters.');
                return;
            }

            // Show loading state
            const btn = this.elements.clarifyBtn;
            btn.disabled = true;
            btn.textContent = 'Processing...';

            const startTime = performance.now();

            try {
                let result;
                let keyPoints = [];
                let multiSummaries = null;
                let readabilityBefore = null;
                let readabilityAfter = null;

                // Calculate readability of original text
                readabilityBefore = Utils.calculateReadability(input);

                if (AppState.mode === 'chrome-ai') {
                    // ===== ENHANCED CHROME AI PROCESSING =====
                    try {
                        // Use streaming for real-time feedback if Language Model available
                        if (AppState.chromeAI.languageModel) {
                            console.log('🚀 Using streaming mode for real-time processing...');
                            result = await ChromeAI.processTextWithStreaming(
                                input,
                                AppState.documentType,
                                AppState.complexityLevel,
                                this.elements.output // Stream directly to output element
                            );
                        }

                        // Fallback to regular processing if streaming unavailable
                        if (!result) {
                            const aiResult = await ChromeAI.processText(input, AppState.documentType, AppState.complexityLevel);
                            if (aiResult && aiResult.text) {
                                result = aiResult.text;
                            }
                        }

                        // Generate multiple summary types if Summarizer API available
                        if (result && AppState.chromeAI.summarizer) {
                            console.log('🚀 Generating 4 types of summaries...');
                            multiSummaries = await ChromeAI.generateMultipleSummaries(input, AppState.documentType);

                            // Extract key points from multi-summaries
                            if (multiSummaries && multiSummaries.keyPoints) {
                                keyPoints = multiSummaries.keyPoints;
                            }
                        }

                    } catch (error) {
                        console.error('Chrome AI error:', error);
                    }
                }

                if (!result) {
                    // ===== FALLBACK PROCESSING (unchanged) =====
                    result = FallbackEngine.process(input, AppState.documentType, AppState.complexityLevel);
                    keyPoints = FallbackEngine.extractKeyPoints(input);
                }

                // Calculate readability of clarified text
                readabilityAfter = Utils.calculateReadability(result);

                const processingTime = performance.now() - startTime;

                // Display results with enhanced data
                this.displayResults(result, keyPoints, input, {
                    multiSummaries: multiSummaries,
                    readabilityBefore: readabilityBefore,
                    readabilityAfter: readabilityAfter,
                    processingTime: processingTime
                });

            } catch (error) {
                console.error('Processing error:', error);
                alert('An error occurred. Please try again.');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Clarify Text';
            }
        },

        displayResults(clarifiedText, keyPoints, originalText, enhancedData = {}) {
            // Show output section
            const outputSection = document.getElementById('output-section');
            const output = document.getElementById('output');

            // Show clarified text (may already be populated by streaming)
            if (!output.textContent || output.textContent.length === 0) {
                output.textContent = clarifiedText;
            }

            // Update individual metric elements
            const originalLength = document.getElementById('original-length');
            const clarifiedLength = document.getElementById('clarified-length');
            const processingTime = document.getElementById('processing-time');
            const aiEngine = document.getElementById('ai-engine');

            if (originalLength) originalLength.textContent = originalText.length.toLocaleString();
            if (clarifiedLength) clarifiedLength.textContent = clarifiedText.length.toLocaleString();

            // Show actual processing time if available
            if (processingTime && enhancedData.processingTime) {
                processingTime.textContent = Utils.formatTime(Math.round(enhancedData.processingTime));
            } else if (processingTime) {
                processingTime.textContent = '<100ms';
            }

            if (aiEngine) aiEngine.textContent = AppState.mode === 'chrome-ai' ? 'Chrome AI' : 'Enhanced';

            // Show key points
            const keypointsList = document.getElementById('keypoints-list');
            if (keypointsList && keyPoints && keyPoints.length > 0) {
                keypointsList.innerHTML = keyPoints
                    .map(point => `<li class="keypoint-item"><div class="keypoint-bullet"></div><div>${point}</div></li>`)
                    .join('');
            }

            // ===== DISPLAY ENHANCED CHROME AI FEATURES =====

            // Display multi-summaries if available
            if (enhancedData.multiSummaries) {
                this.displayMultiSummaries(enhancedData.multiSummaries);
            }

            // Display readability comparison if available
            if (enhancedData.readabilityBefore && enhancedData.readabilityAfter) {
                this.displayReadabilityComparison(enhancedData.readabilityBefore, enhancedData.readabilityAfter);
            }

            // Show output section
            outputSection.classList.remove('hidden');
            outputSection.scrollIntoView({ behavior: 'smooth' });
        },

        /**
         * Display multiple summary types (Chrome AI only feature)
         */
        displayMultiSummaries(summaries) {
            // Check if multi-summary UI elements exist
            const summaryTabs = document.getElementById('summary-tabs');
            const summaryDisplay = document.getElementById('summary-display');

            if (!summaryTabs || !summaryDisplay) {
                console.log('Multi-summary UI not available, creating dynamically...');
                this.createMultiSummaryUI(summaries);
                return;
            }

            // Populate existing UI
            summaryDisplay.innerHTML = `
                <div class="summary-tab-content active" data-summary="headline">
                    <h4>📰 Headline Summary</h4>
                    <p class="summary-text">${summaries.headline || 'Not available'}</p>
                </div>
                <div class="summary-tab-content" data-summary="tldr">
                    <h4>⚡ TL;DR</h4>
                    <p class="summary-text">${summaries.tldr || 'Not available'}</p>
                </div>
                <div class="summary-tab-content" data-summary="teaser">
                    <h4>🎯 Teaser</h4>
                    <p class="summary-text">${summaries.teaser || 'Not available'}</p>
                </div>
                <div class="summary-tab-content" data-summary="keypoints">
                    <h4>🔑 Key Points</h4>
                    <ul class="summary-list">
                        ${summaries.keyPoints && summaries.keyPoints.length > 0
                            ? summaries.keyPoints.map(point => `<li>${point}</li>`).join('')
                            : '<li>Not available</li>'}
                    </ul>
                </div>
            `;

            // Show multi-summary section
            const multiSummarySection = document.getElementById('multi-summary-section');
            if (multiSummarySection) {
                multiSummarySection.classList.remove('hidden');
            }

            console.log('✅ Displayed 4 summary types');
        },

        /**
         * Display readability comparison (shows improvement)
         */
        displayReadabilityComparison(before, after) {
            const readabilitySection = document.getElementById('readability-section');

            if (!readabilitySection) {
                console.log('Readability UI not available, creating dynamically...');
                this.createReadabilityUI(before, after);
                return;
            }

            readabilitySection.innerHTML = `
                <h3 class="section-subtitle">📊 Readability Improvement</h3>
                <div class="readability-comparison">
                    <div class="readability-before">
                        <div class="readability-label">Before</div>
                        <div class="grade-level grade-${before.gradeLevel > 12 ? 'high' : before.gradeLevel > 6 ? 'medium' : 'low'}">
                            Grade ${before.gradeLevel}
                        </div>
                        <div class="readability-detail">${before.complexity}</div>
                        <div class="readability-stats">
                            <span>${before.avgSentenceLength} words/sentence</span>
                            <span>${before.avgSyllablesPerWord} syllables/word</span>
                        </div>
                    </div>
                    <div class="readability-arrow">→</div>
                    <div class="readability-after">
                        <div class="readability-label">After</div>
                        <div class="grade-level grade-${after.gradeLevel > 12 ? 'high' : after.gradeLevel > 6 ? 'medium' : 'low'}">
                            Grade ${after.gradeLevel}
                        </div>
                        <div class="readability-detail">${after.complexity}</div>
                        <div class="readability-stats">
                            <span>${after.avgSentenceLength} words/sentence</span>
                            <span>${after.avgSyllablesPerWord} syllables/word</span>
                        </div>
                    </div>
                </div>
                <div class="improvement-badge">
                    ${before.gradeLevel > after.gradeLevel
                        ? `✅ Reduced by ${before.gradeLevel - after.gradeLevel} grade levels`
                        : '✅ Maintained readability'}
                </div>
            `;

            readabilitySection.classList.remove('hidden');
            console.log('✅ Displayed readability comparison');
        },

        createMultiSummaryUI(summaries) {
            // Insert multi-summary section dynamically after output
            const outputSection = document.getElementById('output-section');
            if (!outputSection) return;

            const multiSummaryHTML = `
                <div id="multi-summary-section" class="enhanced-section" style="margin-top: 2rem;">
                    <h3 class="section-subtitle">📋 Multiple Summary Types (Chrome AI)</h3>
                    <div class="summary-tabs" id="summary-tabs">
                        <button class="tab active" onclick="ClariaApp.switchSummaryTab('headline')">📰 Headline</button>
                        <button class="tab" onclick="ClariaApp.switchSummaryTab('tldr')">⚡ TL;DR</button>
                        <button class="tab" onclick="ClariaApp.switchSummaryTab('teaser')">🎯 Teaser</button>
                        <button class="tab" onclick="ClariaApp.switchSummaryTab('keypoints')">🔑 Key Points</button>
                    </div>
                    <div id="summary-display" style="padding: 1rem; background: #f9fafb; border-radius: 8px; margin-top: 1rem;">
                        <div class="summary-tab-content active" data-summary="headline">
                            <h4>📰 Headline Summary</h4>
                            <p>${summaries.headline || 'Not available'}</p>
                        </div>
                        <div class="summary-tab-content" data-summary="tldr" style="display: none;">
                            <h4>⚡ TL;DR</h4>
                            <p>${summaries.tldr || 'Not available'}</p>
                        </div>
                        <div class="summary-tab-content" data-summary="teaser" style="display: none;">
                            <h4>🎯 Teaser</h4>
                            <p>${summaries.teaser || 'Not available'}</p>
                        </div>
                        <div class="summary-tab-content" data-summary="keypoints" style="display: none;">
                            <h4>🔑 Key Points</h4>
                            <ul>${summaries.keyPoints ? summaries.keyPoints.map(p => `<li>${p}</li>`).join('') : '<li>Not available</li>'}</ul>
                        </div>
                    </div>
                </div>
            `;

            outputSection.insertAdjacentHTML('beforeend', multiSummaryHTML);
        },

        createReadabilityUI(before, after) {
            const outputSection = document.getElementById('output-section');
            if (!outputSection) return;

            const readabilityHTML = `
                <div id="readability-section" class="enhanced-section" style="margin-top: 2rem;">
                    <h3 class="section-subtitle">📊 Readability Improvement</h3>
                    <div style="display: flex; gap: 2rem; align-items: center; padding: 1rem; background: #f9fafb; border-radius: 8px;">
                        <div style="flex: 1; text-align: center;">
                            <div style="color: #6b7280; margin-bottom: 0.5rem;">Before</div>
                            <div style="font-size: 2rem; font-weight: bold; color: #ef4444;">Grade ${before.gradeLevel}</div>
                            <div style="color: #6b7280;">${before.complexity}</div>
                        </div>
                        <div style="font-size: 2rem;">→</div>
                        <div style="flex: 1; text-align: center;">
                            <div style="color: #6b7280; margin-bottom: 0.5rem;">After</div>
                            <div style="font-size: 2rem; font-weight: bold; color: #10b981;">Grade ${after.gradeLevel}</div>
                            <div style="color: #6b7280;">${after.complexity}</div>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 1rem; color: #059669; font-weight: 600;">
                        ✅ ${before.gradeLevel > after.gradeLevel ? `Improved by ${before.gradeLevel - after.gradeLevel} grade levels!` : 'Maintained readability'}
                    </div>
                </div>
            `;

            outputSection.insertAdjacentHTML('beforeend', readabilityHTML);
        },

        switchSummaryTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.summary-tab-content').forEach(content => {
                content.style.display = 'none';
                content.classList.remove('active');
            });

            // Remove active class from all tabs
            document.querySelectorAll('#summary-tabs .tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab
            const selectedContent = document.querySelector(`.summary-tab-content[data-summary="${tabName}"]`);
            if (selectedContent) {
                selectedContent.style.display = 'block';
                selectedContent.classList.add('active');
            }

            // Highlight active tab button
            const tabButtons = document.querySelectorAll('#summary-tabs .tab');
            const tabIndex = ['headline', 'tldr', 'teaser', 'keypoints'].indexOf(tabName);
            if (tabButtons[tabIndex]) {
                tabButtons[tabIndex].classList.add('active');
            }
        },

        getMethodDisplayName(method) {
            const names = {
                'rewriter': 'Chrome Rewriter API',
                'languageModel': 'Chrome Language Model',
                'writer': 'Chrome Writer API',
                'fallback': 'Enhanced Fallback Engine'
            };
            return names[method] || method;
        },


        showError(message) {
            // Simple error display - could be enhanced with a proper modal
            alert(message);
        },

        updateCharCount(length) {
            this.elements.charCount.textContent = `${length.toLocaleString()} / 10,000`;

            // Add warning color near limit
            if (length > 9000) {
                this.elements.charCount.style.color = '#ef4444';
            } else if (length > 8000) {
                this.elements.charCount.style.color = '#f59e0b';
            } else {
                this.elements.charCount.style.color = '#6b7280';
            }
        },

        autoResizeTextarea() {
            const textarea = this.elements.input;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
        },

        updateStatus(text, type) {
            this.elements.statusText.textContent = text;
            this.elements.aiStatus.className = `ai-status ai-status-${type}`;
        },

        updateUI() {
            this.updateCharCount(this.elements.input.value.length);
            this.autoResizeTextarea();
        },

        loadExamples() {
            try {
                const examplesScript = document.getElementById('examples-data');
                if (examplesScript) {
                    window.examples = JSON.parse(examplesScript.textContent);
                }
            } catch (error) {
                console.warn('Failed to load examples:', error);
                // Fallback examples
                window.examples = {
                    legal: "WHEREAS, the Party of the First Part hereby grants...",
                    medical: "Patient presents with acute myocardial infarction...",
                    technical: "The REST API utilizes OAuth 2.0 authentication..."
                };
            }
        },

        loadExample(type) {
            if (window.examples && window.examples[type]) {
                this.elements.input.value = window.examples[type];
                this.updateCharCount(window.examples[type].length);
                this.autoResizeTextarea();

                // Auto-select the corresponding document type
                const typeButton = document.querySelector(`[data-type="${type}"]`);
                if (typeButton) {
                    this.handleTypeChange(typeButton);
                }
            }
        },

        async copyToClipboard() {
            const output = document.getElementById('output');
            const copyBtn = document.getElementById('copy-btn');
            const text = output.textContent;

            try {
                await navigator.clipboard.writeText(text);

                // Visual feedback
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 2000);
            } catch (error) {
                console.error('Copy failed:', error);
                alert('Failed to copy to clipboard');
            }
        },

        downloadText() {
            const output = document.getElementById('output');
            const text = output.textContent;
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `claria-clarified-${timestamp}.txt`;

            try {
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);

                // Visual feedback
                const originalText = this.elements.downloadBtn.innerHTML;
                this.elements.downloadBtn.innerHTML = '<span class="btn-icon">✅</span> Downloaded!';

                setTimeout(() => {
                    this.elements.downloadBtn.innerHTML = originalText;
                }, 2000);
            } catch (error) {
                console.error('Download failed:', error);
                this.showError('Failed to download file');
            }
        },

        speakText() {
            const text = this.elements.output.textContent;

            if (!text) {
                this.showError('No text to speak');
                return;
            }

            // Stop any current speech
            speechSynthesis.cancel();

            try {
                const utterance = new SpeechSynthesisUtterance(text);

                // Enhanced voice settings for clarity
                utterance.rate = 0.85;     // Slightly slower for clarity
                utterance.pitch = 1.0;     // Normal pitch
                utterance.volume = 1.0;    // Full volume

                // Enhanced voice selection for maximum clarity
                const voices = speechSynthesis.getVoices();

                // Priority order: Local > Google > Apple > Microsoft > Any English
                let selectedVoice = null;

                // First try local high-quality voices
                selectedVoice = voices.find(voice =>
                    voice.lang.startsWith('en') &&
                    voice.localService &&
                    (voice.name.includes('Natural') || voice.name.includes('Enhanced') || voice.name.includes('Premium'))
                );

                // Then try system default voices
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice =>
                        voice.lang.startsWith('en') &&
                        voice.localService &&
                        voice.default
                    );
                }

                // Then try any local English voice
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice =>
                        voice.lang.startsWith('en') &&
                        voice.localService
                    );
                }

                // Finally, any English voice
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
                }

                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    console.log('Selected voice:', selectedVoice.name, selectedVoice.lang);
                }

                // Visual feedback without emoji
                const speakBtn = this.elements.speakBtn;
                const originalContent = speakBtn.innerHTML;
                const speakIcon = speakBtn.querySelector('svg').outerHTML;

                speakBtn.innerHTML = speakIcon + ' Speaking...';
                speakBtn.disabled = true;

                utterance.onend = () => {
                    speakBtn.innerHTML = originalContent;
                    speakBtn.disabled = false;
                };

                utterance.onerror = (event) => {
                    console.error('Speech synthesis error:', event);
                    speakBtn.innerHTML = originalContent;
                    speakBtn.disabled = false;
                    alert('Speech synthesis failed');
                };

                // Small delay to ensure voices are loaded
                setTimeout(() => {
                    speechSynthesis.speak(utterance);
                }, 100);
            } catch (error) {
                console.error('Speech synthesis error:', error);
                this.showError('Text-to-speech not supported');
            }
        },

        // ============================================
        // ENHANCED FEATURES: Multimodal Processing
        // ============================================

        /**
         * Handle audio file upload and processing
         * Only works when Chrome AI multimodal Prompt API is available
         */
        async handleAudioUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Check if Chrome AI is available
            if (AppState.mode !== 'chrome-ai' || !AppState.chromeAI.languageModel) {
                alert('Audio processing requires Chrome AI Language Model API.\n\nThis feature is only available on Intel/AMD devices with Chrome 127+ and AI features enabled.');
                event.target.value = ''; // Reset file input
                return;
            }

            // Validate file type
            if (!file.type.startsWith('audio/')) {
                alert('Please upload an audio file (MP3, WAV, M4A, etc.)');
                event.target.value = '';
                return;
            }

            // Show processing state
            const btn = this.elements.clarifyBtn;
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Processing Audio...';

            const startTime = performance.now();

            try {
                console.log(`Processing audio file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

                // Process audio using multimodal Prompt API
                const result = await ChromeAI.processAudioDocument(
                    file,
                    AppState.documentType,
                    AppState.complexityLevel
                );

                if (result) {
                    const processingTime = performance.now() - startTime;

                    // Calculate readability
                    const readabilityAfter = Utils.calculateReadability(result);

                    // Display results
                    this.displayResults(result, [], `[Audio: ${file.name}]`, {
                        processingTime: processingTime,
                        readabilityAfter: readabilityAfter
                    });

                    // Show success message
                    alert(`Audio processed successfully!\n\nTranscribed and simplified in ${Utils.formatTime(Math.round(processingTime))}`);
                } else {
                    throw new Error('Audio processing failed - no result returned');
                }

            } catch (error) {
                console.error('Audio processing error:', error);
                alert(`Failed to process audio file.\n\nError: ${error.message}\n\nNote: Multimodal features require Chrome 127+ with AI features enabled.`);
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
                event.target.value = ''; // Reset file input
            }
        },

        /**
         * Handle image file upload and processing
         * Only works when Chrome AI multimodal Prompt API is available
         */
        async handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Check if Chrome AI is available
            if (AppState.mode !== 'chrome-ai' || !AppState.chromeAI.languageModel) {
                alert('Image processing requires Chrome AI Language Model API.\n\nThis feature is only available on Intel/AMD devices with Chrome 127+ and AI features enabled.');
                event.target.value = ''; // Reset file input
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file (PNG, JPG, JPEG, etc.)');
                event.target.value = '';
                return;
            }

            // Show processing state
            const btn = this.elements.clarifyBtn;
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Processing Image...';

            const startTime = performance.now();

            try {
                console.log(`Processing image file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

                // Process image using multimodal Prompt API
                const result = await ChromeAI.processImageDocument(
                    file,
                    AppState.documentType,
                    AppState.complexityLevel
                );

                if (result) {
                    const processingTime = performance.now() - startTime;

                    // Calculate readability
                    const readabilityAfter = Utils.calculateReadability(result);

                    // Display results
                    this.displayResults(result, [], `[Image: ${file.name}]`, {
                        processingTime: processingTime,
                        readabilityAfter: readabilityAfter
                    });

                    // Show success message
                    alert(`Image processed successfully!\n\nExtracted and simplified text in ${Utils.formatTime(Math.round(processingTime))}`);
                } else {
                    throw new Error('Image processing failed - no result returned');
                }

            } catch (error) {
                console.error('Image processing error:', error);
                alert(`Failed to process image file.\n\nError: ${error.message}\n\nNote: Multimodal features require Chrome 127+ with AI features enabled.`);
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
                event.target.value = ''; // Reset file input
            }
        }
    };

    // Initialize application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ClariaApp.init();
        });
    } else {
        ClariaApp.init();
    }

    // Cleanup Chrome AI sessions on page unload
    window.addEventListener('beforeunload', () => {
        ChromeAI.cleanup();
    });

    // Panel Navigation System
    const PanelSystem = {
        activePanel: null,

        init() {
            this.bindEvents();
        },

        bindEvents() {
            // Close panel when clicking overlay or close button
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('info-panel')) {
                    this.closePanel();
                }
                if (e.target.closest('.panel-close')) {
                    this.closePanel();
                }
            });

            // Close panel with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.activePanel) {
                    this.closePanel();
                }
            });
        },

        openPanel(panelId) {
            const panel = document.getElementById(`${panelId}-panel`);
            if (!panel) return;

            this.activePanel = panel;
            panel.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        },

        closePanel() {
            if (this.activePanel) {
                this.activePanel.classList.remove('active');
                document.body.style.overflow = ''; // Restore scrolling
                this.activePanel = null;
            }
        }
    };

    // Global panel functions for HTML onclick events
    window.openPanel = (panelId) => PanelSystem.openPanel(panelId);
    window.closePanel = () => PanelSystem.closePanel();

    // Initialize panel system
    PanelSystem.init();

    // Modal System
    const ModalSystem = {
        init() {
            // Setup modal event listeners
            this.setupModalListeners();
        },

        setupModalListeners() {
            // About and Privacy link clicks
            const aboutLink = document.querySelector('a[href="#about"]');
            const privacyLink = document.querySelector('a[href="#privacy"]');
            const availabilityLink = document.getElementById('availability-info');

            if (aboutLink) {
                aboutLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openModal('about-modal');
                });
            }

            if (privacyLink) {
                privacyLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openModal('privacy-modal');
                });
            }

            if (availabilityLink) {
                availabilityLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.updateAIStatusInModal();
                    this.openModal('ai-availability-modal');
                });
            }

            // Close button clicks
            document.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.closeAllModals();
                });
            });

            // Backdrop clicks
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                backdrop.addEventListener('click', () => {
                    this.closeAllModals();
                });
            });

            // Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeAllModals();
                }
            });
        },

        openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden'; // Prevent background scroll
            }
        },

        closeAllModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
            });
            document.body.style.overflow = ''; // Restore scroll
        },

        updateAIStatusInModal() {
            const statusIndicator = document.getElementById('current-ai-status');
            const statusMessage = document.getElementById('status-message');

            if (!statusIndicator || !statusMessage) return;

            // Check if any Chrome AI APIs are available
            const hasLanguageModel = AppState.chromeAI.languageModel;
            const hasWriter = AppState.chromeAI.writer;
            const hasRewriter = AppState.chromeAI.rewriter;
            const hasSummarizer = AppState.chromeAI.summarizer;

            const availableAPIs = [hasLanguageModel, hasWriter, hasRewriter, hasSummarizer].filter(Boolean).length;

            if (availableAPIs > 0) {
                statusIndicator.className = 'status-indicator available';
                statusMessage.textContent = `Chrome AI Active (${availableAPIs}/4 APIs available)`;
            } else {
                statusIndicator.className = 'status-indicator unavailable';
                statusMessage.textContent = 'Chrome AI Unavailable - Using Enhanced Fallback Engine';
            }
        }
    };

    // Initialize modal system
    ModalSystem.init();

    // Export for debugging
    window.ClariaApp = ClariaApp;
    window.ChromeAI = ChromeAI;
    window.AppState = AppState;
    window.PanelSystem = PanelSystem;
    window.ModalSystem = ModalSystem;

})();