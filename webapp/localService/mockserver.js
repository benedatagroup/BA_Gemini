sap.ui.define([
	"sap/ui/core/util/MockServer",
	"sap/base/util/UriParameters"
], function (MockServer, UriParameters) {
	"use strict";

	return {
		init: function () {
			// create
			var oMockServer = new MockServer({
				rootUri: "/sap/opu/odata/sap/INVOICE_SRV/"
			});

			var oUriParameters = new UriParameters(window.location.href);

			// configure mock server with a delay
			MockServer.config({
				autoRespond: true,
				autoRespondAfter: oUriParameters.get("serverDelay") || 500
			});

			// simulate
			var sPath = sap.ui.require.toUrl("bagemini/localService");
			oMockServer.simulate(sPath + "/metadata.xml", sPath + "/mockdata");

			var aRequests = oMockServer.getRequests();
			aRequests.forEach(function (oRequest) {
				if (oRequest.method === "GET") {
					var fnOriginalHandler = oRequest.response;
					oRequest.response = function (oXhr) {
						if (oXhr.url && oXhr.url.match(/(?:%24|\$)filter=[^&]*(?:not%28|not\()/)) {
							oXhr.url = oXhr.url.replace(/[?&](?:%24|\$)filter=[^&]*(?:not%28|not\()[^&]*/g, "");
							if (oXhr.url.indexOf("?") === -1 && oXhr.url.indexOf("&") !== -1) {
								oXhr.url = oXhr.url.replace("&", "?");
							}
						}
						return fnOriginalHandler.apply(this, arguments);
					};
				}
			});
			oMockServer.setRequests(aRequests);

			// start
			oMockServer.start();
		}
	};
});
