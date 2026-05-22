sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("bagemini.controller.View1", {
        onInit() {
        },

        onSearch: function () {
            var aFilters = [];
            
            // Basic Search
            var sQuery = this.byId("searchField").getValue();
            if (sQuery && sQuery.length > 0) {
                var oFilter1 = new Filter("InvoiceNumber", FilterOperator.Contains, sQuery);
                var oFilter2 = new Filter("VendorName", FilterOperator.Contains, sQuery);
                var oCombinedFilter = new Filter({
                    filters: [oFilter1, oFilter2],
                    and: false
                });
                aFilters.push(oCombinedFilter);
            }

            // Status Filter
            var sStatus = this.byId("statusFilter").getSelectedKey();
            if (sStatus && sStatus !== "All") {
                aFilters.push(new Filter("Status", FilterOperator.EQ, sStatus));
            }

            // Date Range Filter
            var oDateRange = this.byId("dateFilter");
            var dDateValue = oDateRange.getDateValue();
            var dSecondDateValue = oDateRange.getSecondDateValue();
            if (dDateValue && dSecondDateValue) {
                aFilters.push(new Filter("InvoiceDate", FilterOperator.BT, dDateValue, dSecondDateValue));
            } else if (dDateValue) {
                aFilters.push(new Filter("InvoiceDate", FilterOperator.EQ, dDateValue));
            }

            // Currency Filter
            var sCurrency = this.byId("currencyFilter").getSelectedKey();
            if (sCurrency) {
                aFilters.push(new Filter("Currency", FilterOperator.EQ, sCurrency));
            }

            // update list binding
            var oTable = this.byId("invoiceTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters, "Application");
        },

        onReset: function () {
            this.byId("searchField").setValue("");
            this.byId("statusFilter").setSelectedKey("All");
            this.byId("dateFilter").setValue("");
            this.byId("currencyFilter").setSelectedKey("");
            
            // trigger search again to clear filters
            this.onSearch();
        },

        onListItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var sInvoiceId = oContext.getProperty("InvoiceId");
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteObject", {
                InvoiceId: sInvoiceId
            });
        }
    });
});