"use client";
import { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function BulkBarcodePrintModal({
  products = [],
  categories = [],
  onClose,
}) {
  const [filterCat, setFilterCat] = useState("All");
  const [filterSubcat, setFilterSubcat] = useState("All");
  const [search, setSearch] = useState("");
  const [paperFormat, setPaperFormat] = useState("thermal"); // "thermal" | "a4"

  // Flattened items: main products + variants ko list item banana
  const [itemsToPrint, setItemsToPrint] = useState([]);
  const canvasRefs = useRef({});

  useEffect(() => {
    const list = [];
    products.forEach((p) => {
      if (p.hasVariants && Array.isArray(p.variants) && p.variants.length > 0) {
        p.variants.forEach((v) => {
          const varLabel = [v.color, v.size].filter(Boolean).join(" - ");
          list.push({
            id: `${p._id}_${v.sku}`,
            productName: p.name,
            displayName: `${p.name} ${varLabel ? `(${varLabel})` : ""}`,
            barcode: v.sku || p.barcode,
            price: v.price || p.price,
            stock: v.stock || 0,
            category: p.category || "",
            subcategory: p.subcategory || "",
            selected: true,
            copies: 1,
          });
        });
      } else {
        list.push({
          id: p._id,
          productName: p.name,
          displayName: p.name,
          barcode: p.barcode,
          price: p.price,
          stock: p.stock || 0,
          category: p.category || "",
          subcategory: p.subcategory || "",
          selected: true,
          copies: 1,
        });
      }
    });
    setItemsToPrint(list);
  }, [products]);

  // Barcode Render effect jab selection ya copies update hon
  useEffect(() => {
    itemsToPrint.forEach((item) => {
      if (item.selected && item.barcode) {
        for (let i = 0; i < item.copies; i++) {
          const key = `${item.id}_${i}`;
          const canvas = canvasRefs.current[key];
          if (canvas) {
            try {
              JsBarcode(canvas, String(item.barcode), {
                format: "CODE128",
                width: 1.5,
                height: 38,
                displayValue: true,
                fontSize: 10,
                margin: 2,
              });
            } catch (err) {
              console.error("Barcode Render Error:", err);
            }
          }
        }
      }
    });
  }, [itemsToPrint, paperFormat]);

  // Filters logic
  const selectedCatObj = categories.find((c) => c.name === filterCat);
  const subcategories = selectedCatObj
    ? selectedCatObj.subcategories || []
    : [];

  const filteredItems = itemsToPrint.filter((item) => {
    const matchesCat = filterCat === "All" || item.category === filterCat;
    const matchesSub =
      filterSubcat === "All" || item.subcategory === filterSubcat;
    const matchesSearch =
      item.displayName.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSub && matchesSearch;
  });

  const handleToggleSelect = (id) => {
    setItemsToPrint((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)),
    );
  };

  const handleSelectAllFiltered = (select) => {
    const filteredIds = new Set(filteredItems.map((i) => i.id));
    setItemsToPrint((prev) =>
      prev.map((it) =>
        filteredIds.has(it.id) ? { ...it, selected: select } : it,
      ),
    );
  };

  const handleCopiesChange = (id, count) => {
    const val = Math.max(1, parseInt(count) || 1);
    setItemsToPrint((prev) =>
      prev.map((it) => (it.id === id ? { ...it, copies: val } : it)),
    );
  };

  // Stock ke barabar quantity set karna
  const handleMatchStockCopies = () => {
    setItemsToPrint((prev) =>
      prev.map((it) => ({ ...it, copies: Math.max(1, Number(it.stock) || 1) })),
    );
  };

  const totalStickersToPrint = itemsToPrint
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + (Number(i.copies) || 0), 0);

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #bulk-barcode-sheet, #bulk-barcode-sheet * {
            visibility: visible !important;
          }
          #bulk-barcode-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
          .barcode-label {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Screen Interface Modal */}
      <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-5 print:hidden backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/80 dark:bg-gray-800/60">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>🏷️ Bulk Barcode Label Print</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Filter and print stickers for products & variants in batch.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 font-bold text-xl px-2 py-1 rounded-xl transition"
            >
              ✕
            </button>
          </div>

          {/* Filter & Options Toolbar */}
          <div className="p-4 border-b dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
              <input
                type="text"
                placeholder="🔍 Search name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />

              <select
                value={filterCat}
                onChange={(e) => {
                  setFilterCat(e.target.value);
                  setFilterSubcat("All");
                }}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none font-bold"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={filterSubcat}
                onChange={(e) => setFilterSubcat(e.target.value)}
                disabled={filterCat === "All" || subcategories.length === 0}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none font-bold disabled:opacity-40"
              >
                <option value="All">All Subcategories</option>
                {subcategories.map((s, idx) => (
                  <option key={idx} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Paper Layout Selector */}
              <select
                value={paperFormat}
                onChange={(e) => setPaperFormat(e.target.value)}
                className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 outline-none font-bold"
              >
                <option value="thermal">Thermal Roll (50mm × 30mm)</option>
                <option value="a4">A4 Sheet Grid (24 Labels)</option>
              </select>
            </div>

            {/* Quick Helper Actions */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllFiltered(true)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Select All Filtered
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllFiltered(false)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={handleMatchStockCopies}
                  className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100"
                  title="Copies = Available Stock"
                >
                  ⚡ Set Copies = Current Stock
                </button>
              </div>

              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                Total Stickers to Print:{" "}
                <strong className="text-blue-600 dark:text-blue-400">
                  {totalStickersToPrint}
                </strong>
              </span>
            </div>
          </div>

          {/* Product Items Selection List */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100 dark:divide-gray-800">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs font-medium">
                No matching items found with selected filters.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`py-2.5 px-2 flex items-center justify-between gap-3 rounded-xl transition ${
                    item.selected
                      ? "bg-blue-50/30 dark:bg-blue-950/20"
                      : "opacity-60"
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggleSelect(item.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">
                        {item.displayName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.barcode}
                        </span>
                        <span>• Price: ₹{item.price}</span>
                        <span>• Stock: {item.stock}</span>
                      </div>
                    </div>
                  </label>

                  {/* Quantity Input */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      Copies:
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      disabled={!item.selected}
                      value={item.copies}
                      onChange={(e) =>
                        handleCopiesChange(item.id, e.target.value)
                      }
                      className="w-16 p-1.5 text-center text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Selected:{" "}
              <strong>{itemsToPrint.filter((i) => i.selected).length}</strong>{" "}
              items
            </span>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={totalStickersToPrint === 0}
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                🖨️ Print Labels ({totalStickersToPrint})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Print Document (Print command aane par automatically render hoga) */}
      <div id="bulk-barcode-sheet" className="hidden print:block">
        <div
          style={
            paperFormat === "thermal"
              ? {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3mm",
                }
              : {
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "2.5mm",
                  padding: "5mm",
                  width: "100%",
                }
          }
        >
          {itemsToPrint
            .filter((item) => item.selected)
            .flatMap((item) =>
              Array.from({ length: Number(item.copies) || 1 }).map(
                (_, cIdx) => {
                  const canvasKey = `${item.id}_${cIdx}`;
                  return (
                    <div
                      key={canvasKey}
                      className="barcode-label border border-black p-1.5 text-center flex flex-col items-center justify-center bg-white text-black"
                      style={{
                        width: paperFormat === "thermal" ? "50mm" : "63.5mm",
                        minHeight:
                          paperFormat === "thermal" ? "30mm" : "33.9mm",
                        boxSizing: "border-box",
                        margin: paperFormat === "thermal" ? "2mm 0" : "0",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "9px",
                          fontWeight: "bold",
                          margin: 0,
                          maxWidth: "95%",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.displayName}
                      </p>
                      <p
                        style={{
                          fontSize: "10px",
                          fontWeight: "900",
                          margin: "1px 0",
                        }}
                      >
                        MRP: ₹{item.price}
                      </p>
                      <canvas
                        ref={(el) => (canvasRefs.current[canvasKey] = el)}
                      />
                    </div>
                  );
                },
              ),
            )}
        </div>
      </div>
    </>
  );
}
