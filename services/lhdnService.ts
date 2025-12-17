// [REF-003] News & In-Depth Tax Logic Integration
// Credit : Wan Mohd Azizi (Rikayu Wilzam)

export interface TaxReliefCategory {
    id: string;
    category: string;
    description: string;
    limit: number;
    keywords: string[];
}

export const TAX_RELIEFS_2025: TaxReliefCategory[] = [
    {
        id: 'IND_001',
        category: 'Individual',
        description: 'Individual & Dependent Relatives',
        limit: 9000,
        keywords: ['self', 'individual', 'personal']
    },
    {
        id: 'LIFESTYLE_001',
        category: 'Lifestyle',
        description: 'Books, PC, Smartphone, Internet, Gym',
        limit: 2500,
        keywords: ['book', 'computer', 'smartphone', 'phone', 'tablet', 'internet', 'broadband', 'gym', 'sport', 'wifi']
    },
    {
        id: 'EV_001',
        category: 'Green Tech',
        description: 'EV Charging Equipment & Composting',
        limit: 2500,
        keywords: ['ev', 'charging', 'compost', 'electric vehicle']
    },
    {
        id: 'MED_001',
        category: 'Medical',
        description: 'Serious illness, fertility (Self/Spouse/Child)',
        limit: 10000,
        keywords: ['medical', 'hospital', 'fertility', 'illness', 'cancer', 'treatment']
    },
    {
        id: 'TECH_001',
        category: 'Education',
        description: 'Upskilling Courses',
        limit: 2000,
        keywords: ['course', 'training', 'upskill', 'seminar', 'workshop', 'python', 'coding']
    }
];

export interface TaxCheckResult {
    itemDescription: string;
    amount: number;
    eligible: boolean;
    matchedRelief?: TaxReliefCategory;
    note?: string;
}

/**
 * Checks a receipt item against 2025 Tax Relief rules.
 * @param description Item description from scanning
 * @param amount Item cost
 */
export const checkTaxReliefEligibility2025 = (description: string, amount: number): TaxCheckResult => {
    const descLower = description.toLowerCase();
    
    for (const relief of TAX_RELIEFS_2025) {
        // Simple keyword matching for now
        if (relief.keywords.some(k => descLower.includes(k))) {
            return {
                itemDescription: description,
                amount,
                eligible: true,
                matchedRelief: relief,
                note: `Eligible for ${relief.category} relief (Limit: RM${relief.limit})`
            };
        }
    }

    return {
        itemDescription: description,
        amount,
        eligible: false,
        note: 'No direct 2025 tax relief match found.'
    };
};

/**
 * Analyzes a full receipt/voucher for potential tax claims.
 */
export const analyzeReceiptForTaxRelief = (items: {description: string, amount: number}[]) => {
    return items.map(item => checkTaxReliefEligibility2025(item.description, item.amount));
};
