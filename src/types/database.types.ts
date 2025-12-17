
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          company_name: string | null
          business_type: string | null
          created_at?: string
        }
        Insert: {
          id: string
          company_name?: string | null
          business_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_name?: string | null
          business_type?: string | null
          created_at?: string
        }
      }
      lhdn_tax_codes: {
        Row: {
          code: string
          description: string
          category: string | null
          default_deductibility_rate: number
          conditions: Json | null
          created_at?: string
        }
        Insert: {
          code: string
          description: string
          category?: string | null
          default_deductibility_rate?: number
          conditions?: Json | null
          created_at?: string
        }
        Update: {
          code?: string
          description?: string
          category?: string | null
          default_deductibility_rate?: number
          conditions?: Json | null
          created_at?: string
        }
      }
      vouchers: {
        Row: {
          id: string
          user_id: string
          payee_name: string | null
          date: string | null
          total_amount: number
          status: string
          voucher_no: string | null
          created_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          payee_name?: string | null
          date?: string | null
          total_amount: number
          status?: string
          voucher_no?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          payee_name?: string | null
          date?: string | null
          total_amount?: number
          status?: string
          voucher_no?: string | null
          created_at?: string
        }
      }
      voucher_items: {
        Row: {
          id: string
          voucher_id: string
          description: string
          amount: number
          lhdn_code_id: string | null
          deductible_amount: number
          created_at?: string
        }
        Insert: {
          id?: string
          voucher_id: string
          description: string
          amount: number
          lhdn_code_id?: string | null
          deductible_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          voucher_id?: string
          description?: string
          amount?: number
          lhdn_code_id?: string | null
          deductible_amount?: number
          created_at?: string
        }
      }
    }
  }
}
