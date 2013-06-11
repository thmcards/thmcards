Cards.module('Set.Details', function(Details, App) {
	Details.Layout = Backbone.Marionette.Layout.extend({
		template: "#set-details-layout",
		regions: {
			detailsRegion: "#set-details-region",
			sideBarRegion: "#set-details-sideBar-region"
		}
	});

});