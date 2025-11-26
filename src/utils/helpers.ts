/**
 * Generate a random alphanumeric join code
 * @param length - Length of the code (default: 6)
 */
export function generateJoinCode(length = 6): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like 0, O, 1, I
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Validate learning goal content with Bloom's Taxonomy verbs
 * Returns true if goal contains operational verbs (supports both English and Indonesian)
 */
export function validateGoalContent(content: string): { isValid: boolean; message: string } {
    const minLength = 20;
    
    // Bloom's Taxonomy verbs in English
    const bloomVerbsEnglish = [
        // Remember
        'define', 'identify', 'list', 'name', 'recall', 'recognize', 'state', 'describe',
        // Understand
        'explain', 'summarize', 'interpret', 'classify', 'compare', 'contrast', 'discuss',
        // Apply
        'apply', 'demonstrate', 'implement', 'solve', 'use', 'execute', 'illustrate',
        // Analyze
        'analyze', 'differentiate', 'examine', 'investigate', 'organize',
        // Evaluate
        'evaluate', 'assess', 'critique', 'judge', 'justify', 'recommend', 'support',
        // Create
        'create', 'design', 'develop', 'construct', 'produce', 'plan', 'compose',
    ];

    // Bloom's Taxonomy verbs in Indonesian (Bahasa Indonesia)
    const bloomVerbsIndonesian = [
        // Mengingat (Remember)
        'mendefinisikan', 'mengidentifikasi', 'menyebutkan', 'mengenali', 'mengingat', 'menghafal', 'mendeskripsikan', 'menyatakan',
        // Memahami (Understand)
        'menjelaskan', 'merangkum', 'menafsirkan', 'mengklasifikasi', 'membandingkan', 'membedakan', 'mendiskusikan', 'mencontohkan',
        // Menerapkan (Apply)
        'menerapkan', 'mendemonstrasikan', 'mengimplementasikan', 'menyelesaikan', 'menggunakan', 'melaksanakan', 'mengilustrasikan', 'mempraktikkan',
        // Menganalisis (Analyze)
        'menganalisis', 'memeriksa', 'menguraikan', 'menyelidiki', 'mengorganisasi', 'menghubungkan', 'mengkritisi',
        // Mengevaluasi (Evaluate)
        'mengevaluasi', 'menilai', 'mengkritik', 'memutuskan', 'membenarkan', 'merekomendasikan', 'menyimpulkan', 'mempertahankan',
        // Mencipta (Create)
        'menciptakan', 'merancang', 'mengembangkan', 'membangun', 'memproduksi', 'merencanakan', 'menyusun', 'menghasilkan',
    ];

    // Combine all verbs
    const allBloomVerbs = [...bloomVerbsEnglish, ...bloomVerbsIndonesian];

    if (content.length < minLength) {
        return {
            isValid: false,
            message: `Tujuan harus minimal ${minLength} karakter`,
        };
    }

    const lowerContent = content.toLowerCase();
    const hasBloomVerb = allBloomVerbs.some((verb) => lowerContent.includes(verb));

    if (!hasBloomVerb) {
        return {
            isValid: false,
            message: 'Tujuan harus mengandung kata kerja aksi dari Taksonomi Bloom (misalnya: menganalisis, merancang, mengevaluasi)',
        };
    }

    return { isValid: true, message: 'Tujuan valid' };
}

/**
 * Sanitize string for safe output
 */
export function sanitizeString(str: string): string {
    return str.replace(/[<>]/g, '').trim();
}

/**
 * Format date for API response
 */
export function formatDate(date: Date): string {
    return date.toISOString();
}
