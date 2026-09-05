# WMS Monthly Reports & Metrics Calculation Reference

This document explains the mathematical formulas, database fields, and business logic used to generate all cards, charts, and metrics in the **Monthly Reports** and **Cashier Audits** modules.

> [!IMPORTANT]
> **Zero Database Changes Notice**:
> All computations, metric aggregations, and charts are calculated dynamically from existing database records and API endpoints (`/sales`, `/supplier-invoices`, `/loadings`). **No tables, migrations, columns, or schemas were altered or created.**

---

## 1. Reporting Period Filter Logic

All monthly metrics and charts are scoped to a selected **Year** and **Month**:
- **Year**: E.g. `2026` (extracted from timestamp `YYYY`).
- **Month**: E.g. `09` for September (extracted from timestamp `MM`).
- **Target Period Prefix**: `YYYY-MM` (e.g. `2026-09`).

A record belongs to the reporting period if its date string starts with `YYYY-MM`:
$$\text{isCurrentPeriod} = \text{record.date.startsWith}("YYYY-MM")$$

---

## 2. Metric Cards: Formulas & Fields

### Card 1: Total Supplies for Month
Measures the total inventory purchases and invoices received from suppliers during the selected month.

- **Source Endpoint**: `GET /api/supplier-invoices`
- **Database Table**: `supplier_invoices`
- **Fields Used**:
  - `invoice_date`: Date invoice was received.
  - `total_bill_amount`: Total financial value billed by supplier for inward goods.
- **Formula**:
  $$\text{Total Supplies Amount} = \sum_{\text{invoice\_date} \in \text{Period}} \text{invoice.total\_bill\_amount}$$
  $$\text{Supplies Count} = \text{Count}(\text{invoices in Period})$$

---

### Card 2: Total Deliveries for Month
Measures the total value and volume of goods loaded and dispatched on delivery trucks to shops or routes during the selected month.

- **Source Endpoint**: `GET /api/loadings?limit=1000`
- **Database Tables**: `loadings` and `load_list_items`
- **Fields Used**:
  - `loadings.loading_date` (or `prepared_date` / `created_at`): Dispatch date.
  - `load_list_items.qty`: Quantity of units loaded.
  - `load_list_items.wh_price` / `net_price`: Unit warehouse wholesale price.
  - `batch__stocks.retail_price`: Catalog retail price fallback.
- **Formula**:
  $$\text{Item Value} = \text{item.qty} \times (\text{item.wh\_price} \parallel \text{item.net\_price} \parallel \text{item.batchStock.retail\_price})$$
  $$\text{Total Deliveries Amount} = \sum_{\text{loadings} \in \text{Period}} \left( \sum_{\text{items}} \text{Item Value} \right)$$
  $$\text{Deliveries Count} = \text{Count}(\text{loadings in Period})$$

---

### Card 3: Total POS Amount (with count)
Measures the total customer revenue collected at checkout from cashier POS terminals during the selected month.

- **Source Endpoint**: `GET /api/sales?limit=5000`
- **Database Table**: `sales`
- **Fields Used**:
  - `sales.date_time`: Date and timestamp of completed POS transaction.
  - `sales.total`: Final payable grand total paid by the customer (net of all item discounts and bill-level discounts).
- **Formula**:
  $$\text{Total POS Amount} = \sum_{\text{date\_time} \in \text{Period}} \text{sale.total}$$
  $$\text{Total POS Count} = \text{Count}(\text{sales in Period})$$

---

### Card 4: Total Profit from POS (with count & margin)
Measures the net gross profit earned from POS sales after subtracting the Cost of Goods Sold (COGS) based on batch buying prices.

- **Source Endpoints & Models**: `sales`, `sale_items`, `batch__stocks`
- **Database Fields Used**:
  - `sale.total`: Customer revenue collected.
  - `sale_item.qty`: Quantity of product sold in the line item.
  - `batch__stocks.netprice`: The purchasing / cost price per unit paid to the supplier when the batch was received.
- **Cost of Goods Sold (COGS) per Sale**:
  $$\text{Unit Cost} = \begin{cases} \text{batchStock.netprice} & \text{if } \text{netprice} > 0 \\ 0.75 \times \text{retail\_price} & \text{if unrecorded (fallback)} \end{cases}$$
  $$\text{Sale COGS} = \sum_{\text{items} \in \text{sale}} (\text{item.qty} \times \text{Unit Cost})$$
- **Sale Profit Calculation**:
  $$\text{Sale Net Profit} = \max(0, \text{sale.total} - \text{Sale COGS})$$
- **Aggregated Totals**:
  $$\text{Total Profit} = \sum_{\text{sales} \in \text{Period}} \text{Sale Net Profit}$$
  $$\text{Profit Margin (\%)} = \left( \frac{\text{Total Profit}}{\text{Total POS Amount}} \right) \times 100\%$$
  $$\text{Profit Count} = \text{Total POS Count}$$

---

## 3. Visual Analytics & Charts

### Chart 1: POS Payment Methods Breakdown (Pie Chart)
Compares Cash payments against Card payments processed in POS.

- **Source Field**: `sales.payment_type` (`"cash"` or `"card"`)
- **Calculations**:
  $$\text{Cash Total} = \sum_{\text{payment\_type} = \text{'cash'}} \text{sale.total}$$
  $$\text{Card Total} = \sum_{\text{payment\_type} = \text{'card'}} \text{sale.total}$$
  $$\text{Cash Share (\%)} = \left( \frac{\text{Cash Total}}{\text{Cash Total} + \text{Card Total}} \right) \times 100\%$$
  $$\text{Card Share (\%)} = \left( \frac{\text{Card Total}}{\text{Cash Total} + \text{Card Total}} \right) \times 100\%$$

---

### Chart 2: Top 10 Most Sold Items (Pie / Donut Chart)
Identifies the highest volume products sold through the register.

- **Source Tables**: `sale_items` joined with `products`
- **Calculations**:
  For each unique product $P$:
  $$\text{Product Total Qty}_P = \sum_{\text{item.product\_id} = P} \text{item.qty}$$
  $$\text{Product Total Revenue}_P = \sum_{\text{item.product\_id} = P} \text{item.total}$$
- **Ranking**: Sorted in descending order by $\text{Product Total Qty}_P$. The top 10 products are plotted on the chart with quantities, revenue contributions, and percentage share.

---

### Chart 3: POS Sales & Profit Growth Across Months (Line Chart)
Illustrates business growth throughout the 12 months of the selected year (`Jan` through `Dec`).

- **X-Axis**: Months $m \in [01, 02, \dots, 12]$ (`Jan` to `Dec`).
- **Y-Axis**: Financial values formatted in `LKR` (with compact notation: `k` for thousands, `M` for millions).
- **Two Distinct Trend Lines**:
  1. **Line 1 (Teal `#0f766e`)**: **Total POS Sales Amount**
     $$\text{Sales}(m) = \sum_{\text{sales in month } m} \text{sale.total}$$
  2. **Line 2 (Amber `#d97706`)**: **Total Net Profit**
     $$\text{Profit}(m) = \sum_{\text{sales in month } m} \text{Sale Net Profit}$$

---

## 4. Cashier Audits Date Filter Separation

In `Settings.tsx` (`/settings/cashier-audits`), the date filter was decoupled into three independent selectors:
- **Year Selector**: All available years (defaults to `currentYear`).
- **Month Selector**: `01` to `12` (defaults to `currentMonth`).
- **Date (Day) Selector**: `01` to `31` (defaults to `currentDay` — today).

### Multi-tier Date Evaluation:
```typescript
const [saleYear, saleMonth, saleDay] = sale.date_time.slice(0, 10).split("-");

if (selectedYear !== "all" && saleYear !== selectedYear) return false;
if (selectedMonth !== "all" && saleMonth !== selectedMonth) return false;
if (selectedDay !== "all" && saleDay !== selectedDay) return false;
```
- **Initial Load**: Shows cashier audits specifically for **today** (`currentYear-currentMonth-currentDay`).
- **"This Month" Shortcut**: Sets Date to `"all"`, keeping current year and month.
- **"Clear" Shortcut**: Resets all three to `"all"` to view all historical audits.
