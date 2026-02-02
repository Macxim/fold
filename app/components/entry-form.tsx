'use client';

import { useState } from 'react';
import { DashboardCard } from './dashboard-card';
import { usePortfolio } from '../hooks/use-portfolio';
import { useToast } from './toast';

export function EntryForm() {
    const { addAsset } = usePortfolio();
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        symbol: '',
        name: '',
        type: 'crypto',
        amount: '',
        manualPrice: '',
        priceCurrency: 'EUR' as 'USD' | 'EUR',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const isBankType = formData.type === 'bank';

        // For bank type: require manualPrice, for others: require amount
        if (!formData.symbol) {
            showToast('Please fill in symbol', 'error');
            return;
        }

        if (isBankType && !formData.manualPrice) {
            showToast('Please fill in the total value', 'error');
            return;
        }

        if (!isBankType && !formData.amount) {
            showToast('Please fill in the quantity', 'error');
            return;
        }

        setLoading(true);

        try {
            // For bank type: amount = 1, price = manualPrice (in originalCurrency)
            // For crypto/stock: amount = quantity, price fetched from API (in USD)
            const result = await addAsset({
                symbol: formData.symbol,
                name: formData.name,
                type: formData.type,
                amount: isBankType ? '1' : formData.amount,
                manualPrice: isBankType ? formData.manualPrice : undefined,
                priceCurrency: formData.priceCurrency,
            });

            if (result.success) {
                showToast(result.message, 'success');
                // Reset form
                setFormData({
                    symbol: '',
                    name: '',
                    type: 'crypto',
                    amount: '',
                    manualPrice: '',
                    priceCurrency: 'EUR',
                });
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('An unexpected error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // If switching to crypto, default to USD for cleaner logs/logic
            ...(name === 'type' && value === 'crypto' ? { priceCurrency: 'USD' } : {}),
            // If switching to bank, default to EUR as it's the more common manual input for this user
            ...(name === 'type' && value === 'bank' ? { priceCurrency: 'EUR' } : {})
        }));
    };

    const inputClasses = "w-full bg-background border border-border px-3 py-2 rounded-none focus:outline-none focus:border-accent text-foreground placeholder:text-muted-foreground/30 text-sm font-mono transition-colors";
    const labelClasses = "block text-[10px] uppercase tracking-widest font-medium text-muted-foreground mb-1.5";

    const showManualPrice = formData.type === 'bank';

    return (
        <div className="space-y-8">
            <DashboardCard title="New Asset Entry" className="max-w-xl mx-auto">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className={labelClasses}>Symbol</label>
                            <input
                                type="text"
                                name="symbol"
                                value={formData.symbol}
                                onChange={handleChange}
                                placeholder={showManualPrice ? "SAVINGS" : formData.type === 'stock' ? "AMZ.DE, AAPL..." : "BTC"}
                                className={inputClasses}
                            />
                        </div>

                        <div>
                            <label className={labelClasses}>Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className={inputClasses}
                            >
                                <option value="crypto">Crypto</option>
                                <option value="stock">Stock</option>
                                <option value="bank">Bank / Investment</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelClasses}>Description (Optional)</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={showManualPrice ? "N26 Savings Account" : "Bitcoin Cold Storage"}
                            className={inputClasses}
                        />
                    </div>

                    {showManualPrice ? (
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>Total Value</label>
                                <input
                                    type="number"
                                    name="manualPrice"
                                    value={formData.manualPrice}
                                    onChange={handleChange}
                                    step="0.01"
                                    placeholder="10000.00"
                                    className={inputClasses}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Currency</label>
                                <select
                                    name="priceCurrency"
                                    value={formData.priceCurrency}
                                    onChange={handleChange}
                                    className={inputClasses}
                                >
                                    <option value="EUR">€ EUR</option>
                                    <option value="USD">$ USD</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className={labelClasses}>Quantity</label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                step="0.00000001"
                                placeholder="0.00"
                                className={inputClasses}
                            />
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="group relative w-full bg-foreground text-background hover:bg-accent hover:text-accent-foreground transition-all duration-300 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-50 active:scale-[0.98] overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    'Adding...'
                                ) : (
                                    <>
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90"
                                        >
                                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                        </svg>
                                        Add Asset
                                    </>
                                )}
                            </span>
                            <div className="absolute inset-0 bg-accent/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </DashboardCard>
        </div>
    );
}