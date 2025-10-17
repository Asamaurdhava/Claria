/**
 * Claria Unit Test Suite
 * Pure vanilla JavaScript testing - no dependencies required
 */

// Simple test framework
const ClariaTests = {
    passed: 0,
    failed: 0,
    tests: [],

    assert(condition, message) {
        if (condition) {
            this.passed++;
            this.log('[PASS]', message, 'pass');
        } else {
            this.failed++;
            this.log('[FAIL]', message, 'fail');
            throw new Error(`Assertion failed: ${message}`);
        }
    },

    assertEqual(actual, expected, message) {
        const condition = actual === expected;
        if (!condition) {
            console.error(`Expected: ${expected}, Got: ${actual}`);
        }
        this.assert(condition, message);
    },

    assertNotEqual(actual, expected, message) {
        this.assert(actual !== expected, message);
    },

    assertTrue(value, message) {
        this.assert(value === true, message);
    },

    assertFalse(value, message) {
        this.assert(value === false, message);
    },

    assertExists(value, message) {
        this.assert(value !== null && value !== undefined, message);
    },

    assertType(value, type, message) {
        this.assert(typeof value === type, message);
    },

    assertGreaterThan(actual, threshold, message) {
        this.assert(actual > threshold, message);
    },

    assertLessThan(actual, threshold, message) {
        this.assert(actual < threshold, message);
    },

    test(name, fn) {
        this.tests.push({ name, fn });
    },

    async run() {
        console.log('[INFO] Running Claria Test Suite...\n');

        for (const { name, fn } of this.tests) {
            try {
                await fn();
                this.log('[PASS]', name, 'pass');
            } catch (error) {
                this.log('[FAIL]', name, 'fail');
                console.error('  Error:', error.message);
            }
        }

        console.log(`\n[RESULTS] ${this.passed} passed, ${this.failed} failed`);

        if (this.failed === 0) {
            console.log('[SUCCESS] All tests passed!');
        } else {
            console.log('[ERROR] Some tests failed');
        }

        return { passed: this.passed, failed: this.failed };
    },

    log(prefix, message, type) {
        const color = type === 'pass' ? 'color: #10b981' : 'color: #ef4444';
        console.log(`%c${prefix} ${message}`, color);
    }
};

// =============================================
// UTILS TESTS
// =============================================

ClariaTests.test('Utils.formatTime - milliseconds', () => {
    ClariaTests.assertEqual(Utils.formatTime(500), '500ms', 'Should format milliseconds');
    ClariaTests.assertEqual(Utils.formatTime(999), '999ms', 'Should format 999ms');
});

ClariaTests.test('Utils.formatTime - seconds', () => {
    ClariaTests.assertEqual(Utils.formatTime(1000), '1.0s', 'Should format 1 second');
    ClariaTests.assertEqual(Utils.formatTime(1500), '1.5s', 'Should format 1.5 seconds');
    ClariaTests.assertEqual(Utils.formatTime(2300), '2.3s', 'Should format 2.3 seconds');
});

ClariaTests.test('Utils.sanitizeHTML - prevents XSS', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = Utils.sanitizeHTML(malicious);
    ClariaTests.assertFalse(sanitized.includes('<script>'), 'Should escape script tags');
    ClariaTests.assertTrue(sanitized.includes('&lt;script&gt;'), 'Should convert to entities');
});

ClariaTests.test('Utils.calculateReadingTime - correct calculation', () => {
    const text = 'word '.repeat(200); // 200 words
    const time = Utils.calculateReadingTime(text);
    ClariaTests.assertEqual(time, 1, 'Should calculate 1 minute for 200 words');

    const longText = 'word '.repeat(1000); // 1000 words
    const longTime = Utils.calculateReadingTime(longText);
    ClariaTests.assertEqual(longTime, 5, 'Should calculate 5 minutes for 1000 words');
});

ClariaTests.test('Utils.calculateReadability - returns valid object', () => {
    const text = 'This is a simple test. It has two sentences.';
    const result = Utils.calculateReadability(text);

    ClariaTests.assertExists(result, 'Should return result object');
    ClariaTests.assertExists(result.gradeLevel, 'Should have gradeLevel');
    ClariaTests.assertExists(result.complexity, 'Should have complexity label');
    ClariaTests.assertType(result.gradeLevel, 'number', 'gradeLevel should be number');
});

ClariaTests.test('Utils.calculateReadability - handles empty text', () => {
    const result = Utils.calculateReadability('');
    ClariaTests.assertEqual(result.gradeLevel, 0, 'Should return 0 for empty text');
    ClariaTests.assertEqual(result.complexity, 'Unknown', 'Should return Unknown complexity');
});

ClariaTests.test('Utils.calculateReadability - Flesch-Kincaid accuracy', () => {
    const simple = 'The cat sat on the mat.';
    const complex = 'The feline specimen positioned itself atop the textile floor covering.';

    const simpleResult = Utils.calculateReadability(simple);
    const complexResult = Utils.calculateReadability(complex);

    ClariaTests.assertLessThan(simpleResult.gradeLevel, complexResult.gradeLevel,
        'Simple text should have lower grade level');
});

ClariaTests.test('Utils.countSyllables - basic words', () => {
    ClariaTests.assertEqual(Utils.countSyllables('cat'), 1, 'Single syllable word');
    ClariaTests.assertEqual(Utils.countSyllables('apple'), 2, 'Two syllable word');
    ClariaTests.assertEqual(Utils.countSyllables('beautiful'), 4, 'Multi syllable word');
});

ClariaTests.test('Utils.countSyllables - handles short words', () => {
    ClariaTests.assertEqual(Utils.countSyllables('I'), 1, 'Single letter word');
    ClariaTests.assertEqual(Utils.countSyllables('at'), 1, 'Two letter word');
    ClariaTests.assertEqual(Utils.countSyllables('the'), 1, 'Three letter word');
});

ClariaTests.test('Utils.getComplexityLabel - correct labels', () => {
    ClariaTests.assertEqual(Utils.getComplexityLabel(2), 'Very Easy', 'Grade 2 is Very Easy');
    ClariaTests.assertEqual(Utils.getComplexityLabel(5), 'Easy', 'Grade 5 is Easy');
    ClariaTests.assertEqual(Utils.getComplexityLabel(9), 'Standard', 'Grade 9 is Standard');
    ClariaTests.assertEqual(Utils.getComplexityLabel(12), 'High School', 'Grade 12 is High School');
    ClariaTests.assertEqual(Utils.getComplexityLabel(16), 'College', 'Grade 16 is College');
    ClariaTests.assertEqual(Utils.getComplexityLabel(18), 'Very Complex', 'Grade 18 is Very Complex');
});

ClariaTests.test('Utils.withTimeout - resolves successful promise', async () => {
    const promise = Promise.resolve('success');
    const result = await Utils.withTimeout(promise, 1000);
    ClariaTests.assertEqual(result, 'success', 'Should resolve promise');
});

ClariaTests.test('Utils.withTimeout - rejects on timeout', async () => {
    const slowPromise = new Promise(resolve => setTimeout(() => resolve('done'), 2000));

    try {
        await Utils.withTimeout(slowPromise, 100);
        ClariaTests.assert(false, 'Should have timed out');
    } catch (error) {
        ClariaTests.assertTrue(error.message.includes('timed out'), 'Should throw timeout error');
    }
});

// =============================================
// FALLBACK ENGINE TESTS
// =============================================

ClariaTests.test('FallbackEngine.process - returns string', () => {
    const input = 'This is a test document with complex terminology.';
    const result = FallbackEngine.process(input, 'auto', 'simple');

    ClariaTests.assertType(result, 'string', 'Should return string');
    ClariaTests.assertGreaterThan(result.length, 0, 'Should return non-empty string');
});

ClariaTests.test('FallbackEngine.process - handles short input', () => {
    const input = 'Hi';
    const result = FallbackEngine.process(input, 'auto', 'simple');
    ClariaTests.assertEqual(result, 'Hi', 'Should return input unchanged for very short text');
});

ClariaTests.test('FallbackEngine.process - processes medical text', () => {
    const input = 'Patient has hypertension and dyspnea.';
    const result = FallbackEngine.process(input, 'medical', 'simple');

    ClariaTests.assertType(result, 'string', 'Should return a string');
    ClariaTests.assertGreaterThan(result.length, 0, 'Should process medical text');
    ClariaTests.assertTrue(result.toLowerCase().includes('patient'), 'Should preserve key medical terms');
});

ClariaTests.test('FallbackEngine.process - replaces legal jargon (simple)', () => {
    const input = 'Pursuant to the aforementioned agreement.';
    const result = FallbackEngine.process(input, 'legal', 'simple');

    ClariaTests.assertTrue(result.includes('based on'),
        'Should replace pursuant to with based on');
    ClariaTests.assertTrue(result.includes('this'),
        'Should replace aforementioned with this');
});

ClariaTests.test('FallbackEngine.process - complexity levels processing', () => {
    const input = 'The patient exhibits myocardial infarction symptoms.';

    const simple = FallbackEngine.process(input, 'medical', 'simple');
    const standard = FallbackEngine.process(input, 'medical', 'standard');
    const educated = FallbackEngine.process(input, 'medical', 'educated');

    ClariaTests.assertExists(simple, 'Simple level should return result');
    ClariaTests.assertExists(standard, 'Standard level should return result');
    ClariaTests.assertExists(educated, 'Educated level should return result');
});

ClariaTests.test('FallbackEngine.process - preserves meaning', () => {
    const input = 'The contract is hereby terminated pursuant to clause 5.';
    const result = FallbackEngine.process(input, 'legal', 'simple');

    ClariaTests.assertTrue(result.includes('contract'), 'Should preserve key terms');
    ClariaTests.assertTrue(result.includes('terminated') || result.includes('ended'),
        'Should preserve action');
});

ClariaTests.test('FallbackEngine.replaceJargon - simple level', () => {
    const input = 'utilize this methodology to facilitate the process';
    const result = FallbackEngine.replaceJargon(input, 'technical', 'simple');

    ClariaTests.assertTrue(result.includes('use'), 'Should replace utilize with use');
    ClariaTests.assertTrue(result.includes('way') || result.includes('method'),
        'Should replace methodology');
    ClariaTests.assertTrue(result.includes('help') || result.includes('make easier'),
        'Should simplify facilitate');
});

ClariaTests.test('FallbackEngine.extractKeyPoints - returns array', () => {
    const input = 'This is important. You must remember this. Another critical point here.';
    const result = FallbackEngine.extractKeyPoints(input);

    ClariaTests.assertTrue(Array.isArray(result), 'Should return array');
    ClariaTests.assertGreaterThan(result.length, 0, 'Should extract at least one point');
    ClariaTests.assertLessThan(result.length, 6, 'Should extract maximum 5 points');
});

ClariaTests.test('FallbackEngine.extractKeyPoints - finds priority words', () => {
    const input = 'This is very important information. You need to know this.';
    const result = FallbackEngine.extractKeyPoints(input);

    ClariaTests.assertGreaterThan(result.length, 0, 'Should find important sentences');
    ClariaTests.assertTrue(result[0].toLowerCase().includes('important') ||
                          result[0].toLowerCase().includes('need'),
                          'Should prioritize sentences with key words');
});

ClariaTests.test('FallbackEngine.simplifyPhrases - transforms phrases', () => {
    const input = 'In order to proceed with the implementation';
    const result = FallbackEngine.simplifyPhrases(input);

    ClariaTests.assertType(result, 'string', 'Should return a string');
    ClariaTests.assertGreaterThan(result.length, 0, 'Should return non-empty result');
});

ClariaTests.test('FallbackEngine.breakLongSentences - processes long sentences', () => {
    const longSentence = 'word '.repeat(30); // 30 words
    const result = FallbackEngine.breakLongSentences(longSentence, 'simple');

    ClariaTests.assertType(result, 'string', 'Should return a string');
    ClariaTests.assertGreaterThan(result.length, 0, 'Should process long sentence');
});

ClariaTests.test('FallbackEngine.simplifyStructure - processes structure', () => {
    const input = 'The document was reviewed by the team.';
    const result = FallbackEngine.simplifyStructure(input, 'simple');

    ClariaTests.assertType(result, 'string', 'Should return a string');
    ClariaTests.assertGreaterThan(result.length, 0, 'Should process sentence structure');
});

ClariaTests.test('FallbackEngine.applyPatternProcessing - complexity aware suffixes', () => {
    const input = 'Patient has gastritis';

    const simple = FallbackEngine.applyPatternProcessing(input, 'simple');
    const standard = FallbackEngine.applyPatternProcessing(input, 'standard');
    const educated = FallbackEngine.applyPatternProcessing(input, 'educated');

    ClariaTests.assertTrue(simple.includes('swelling'), 'Simple level should use "swelling" for -itis');
    ClariaTests.assertTrue(standard.includes('inflammation'), 'Standard level should use "inflammation" for -itis');
    ClariaTests.assertTrue(educated.includes('inflammation'), 'Educated level should use "inflammation" for -itis');
    ClariaTests.assertNotEqual(simple, standard, 'Simple and standard outputs should differ');
});

ClariaTests.test('FallbackEngine.applyPatternProcessing - complexity aware prefixes', () => {
    const input = 'The system is hyperactive';

    const simple = FallbackEngine.applyPatternProcessing(input, 'simple');
    const standard = FallbackEngine.applyPatternProcessing(input, 'standard');
    const educated = FallbackEngine.applyPatternProcessing(input, 'educated');

    ClariaTests.assertTrue(simple.includes('too much'), 'Simple level should use "too much" for hyper-');
    ClariaTests.assertTrue(standard.includes('above normal'), 'Standard level should use "above normal" for hyper-');
    ClariaTests.assertTrue(educated.includes('elevated'), 'Educated level should use "elevated" for hyper-');
});

ClariaTests.test('FallbackEngine - complexity differentiation in full processing', () => {
    const input = 'Patient has gastritis and hypertension';

    const simple = FallbackEngine.process(input, 'medical', 'simple');
    const educated = FallbackEngine.process(input, 'medical', 'educated');

    ClariaTests.assertNotEqual(simple, educated, 'Simple and educated outputs should differ');
    ClariaTests.assertTrue(simple.includes('high blood pressure'), 'Simple should simplify hypertension');
    ClariaTests.assertTrue(educated.includes('elevated blood pressure'), 'Educated should use more precise terms');
});

// =============================================
// APP STATE TESTS
// =============================================

ClariaTests.test('AppState - initial values', () => {
    ClariaTests.assertExists(AppState, 'AppState should exist');
    ClariaTests.assertExists(AppState.mode, 'Should have mode property');
    ClariaTests.assertExists(AppState.documentType, 'Should have documentType property');
    ClariaTests.assertExists(AppState.complexityLevel, 'Should have complexityLevel property');
});

ClariaTests.test('AppState - valid initial modes', () => {
    const validModes = ['initializing', 'chrome-ai', 'fallback'];
    ClariaTests.assertTrue(validModes.includes(AppState.mode),
        `Mode should be one of: ${validModes.join(', ')}`);
});

ClariaTests.test('AppState - Chrome AI status tracking', () => {
    ClariaTests.assertExists(AppState.chromeAI, 'Should have chromeAI status object');
    ClariaTests.assertType(AppState.chromeAI.languageModel, 'boolean',
        'languageModel should be boolean');
    ClariaTests.assertType(AppState.chromeAI.writer, 'boolean',
        'writer should be boolean');
    ClariaTests.assertType(AppState.chromeAI.rewriter, 'boolean',
        'rewriter should be boolean');
    ClariaTests.assertType(AppState.chromeAI.summarizer, 'boolean',
        'summarizer should be boolean');
});

// =============================================
// INTEGRATION TESTS
// =============================================

ClariaTests.test('Integration - Simple to Complex text transformation', () => {
    const complexText = 'The aforementioned party hereby undertakes to utilize all reasonable endeavours.';
    const result = FallbackEngine.process(complexText, 'legal', 'simple');

    ClariaTests.assertLessThan(result.length, complexText.length + 20,
        'Simplified text should not be much longer');
    ClariaTests.assertFalse(result.includes('aforementioned'),
        'Should remove complex legal terms');
    ClariaTests.assertTrue(result.length > 0, 'Should return processed text');
});

ClariaTests.test('Integration - Medical document simplification', () => {
    const medicalText = 'Patient presents with acute myocardial infarction and severe dyspnea.';
    const result = FallbackEngine.process(medicalText, 'medical', 'simple');

    ClariaTests.assertTrue(result.includes('heart attack'),
        'Should simplify myocardial infarction');
    ClariaTests.assertTrue(result.includes('trouble breathing'),
        'Should simplify dyspnea');
});

ClariaTests.test('Integration - Technical document simplification', () => {
    const techText = 'Utilize the API to implement authentication and optimize the infrastructure.';
    const result = FallbackEngine.process(techText, 'technical', 'simple');

    ClariaTests.assertTrue(result.includes('use') || result.includes('Use'),
        'Should replace utilize with use');
    ClariaTests.assertTrue(result.includes('do') || result.includes('make'),
        'Should simplify implement');
});

ClariaTests.test('Integration - Readability improves after processing', () => {
    const complex = 'Notwithstanding the aforementioned provisions, pursuant to regulatory requirements.';
    const simple = FallbackEngine.process(complex, 'legal', 'simple');

    const complexScore = Utils.calculateReadability(complex).gradeLevel;
    const simpleScore = Utils.calculateReadability(simple).gradeLevel;

    ClariaTests.assertLessThan(simpleScore, complexScore,
        'Simplified text should have lower grade level');
});

// =============================================
// EDGE CASES & ERROR HANDLING
// =============================================

ClariaTests.test('Edge Case - Empty string input', () => {
    const result = FallbackEngine.process('', 'auto', 'simple');
    ClariaTests.assertEqual(result, '', 'Should handle empty string');
});

ClariaTests.test('Edge Case - Very long text', () => {
    const longText = 'This is a sentence. '.repeat(1000); // 1000 sentences
    const result = FallbackEngine.process(longText, 'auto', 'simple');

    ClariaTests.assertGreaterThan(result.length, 0, 'Should process long text');
    ClariaTests.assertType(result, 'string', 'Should return string');
});

ClariaTests.test('Edge Case - Special characters', () => {
    const input = 'Test with special chars: @#$%^&*()[]{}|\\';
    const result = FallbackEngine.process(input, 'auto', 'simple');

    ClariaTests.assertGreaterThan(result.length, 0, 'Should handle special characters');
});

ClariaTests.test('Edge Case - Numbers and symbols', () => {
    const input = 'The price is $1,234.56 for 100% satisfaction.';
    const result = FallbackEngine.process(input, 'financial', 'simple');

    ClariaTests.assertTrue(result.includes('$') || result.includes('price'),
        'Should preserve financial symbols');
});

ClariaTests.test('Edge Case - Unicode and emoji', () => {
    const input = 'Hello 世界 🌍 Testing unicode';
    const result = FallbackEngine.process(input, 'auto', 'simple');

    ClariaTests.assertGreaterThan(result.length, 0, 'Should handle unicode');
});

// =============================================
// PERFORMANCE TESTS
// =============================================

ClariaTests.test('Performance - Processing time under 100ms', () => {
    const text = 'This is a test sentence. '.repeat(50); // 50 sentences
    const start = performance.now();

    FallbackEngine.process(text, 'auto', 'simple');

    const duration = performance.now() - start;
    ClariaTests.assertLessThan(duration, 100,
        `Processing should be under 100ms (was ${duration.toFixed(2)}ms)`);
});

ClariaTests.test('Performance - Readability calculation is fast', () => {
    const text = 'word '.repeat(1000); // 1000 words
    const start = performance.now();

    Utils.calculateReadability(text);

    const duration = performance.now() - start;
    ClariaTests.assertLessThan(duration, 50,
        `Readability should be under 50ms (was ${duration.toFixed(2)}ms)`);
});

// =============================================
// RUN ALL TESTS
// =============================================

// Auto-run tests when loaded
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        await ClariaTests.run();
    });
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClariaTests;
}
