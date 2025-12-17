
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type TaxCode = Database['public']['Tables']['lhdn_tax_codes']['Row'];
type BusinessType = 'sdn_bhd' | 'sole_prop' | 'partnership';

/**
 * Calculates the deductible amount for a given item based on its LHDN code and the user's business type.
 * @param amount The total amount of the expense item.
 * @param taxCode The LHDN tax code object.
 * @param businessType The business type of the user profile.
 */
export const calculateDeductibility = (amount: number, taxCode: TaxCode, businessType: BusinessType = 'sdn_bhd'): number => {
    let rate = taxCode.default_deductibility_rate;

    // Example of tailored logic based on business type or conditions
    // This is where we would implement the specific logic from the datasets
    if (taxCode.category === 'Entertainment' && businessType === 'sole_prop') {
        // Example rule: Sole props might have stricter entertainment rules (just hypothetical)
        // rate = 0; 
    }

    if (taxCode.conditions) {
        // Parse JSON conditions here if complex logic is needed
    }

    return amount * rate;
};

/**
 * Ingests tax codes from a dataset (Placeholder).
 * This function would parse a CSV/JSON file and insert into the lhdn_tax_codes table.
 */
export const ingestLhdnDataset = async (dataset: any[]) => {
    const { error } = await supabase
        .from('lhdn_tax_codes')
        .upsert(dataset, { onConflict: 'code' });
    
    if (error) {
        console.error('Error ingesting LHDN dataset:', error);
        throw error;
    }
    return true;
};

export const fetchTaxCodes = async (): Promise<TaxCode[]> => {
    const { data, error } = await supabase
        .from('lhdn_tax_codes')
        .select('*');
    
    if (error) {
        console.error('Error fetching tax codes:', error);
        return [];
    }
    return data || [];
};
