Cards.module('Set.Details', function(Details, App) {
	Details.Layout = Backbone.Marionette.Layout.extend({
		template: "#set-details-layout",
		regions: {
			detailsRegion: "#set-details-region",
			sideBarRegion: "#set-details-sideBar-region",
			ratingRegion: "#set-details-rating-region",
			controlsRegion: "#set-details-controls-region",
		},
		onRender: function(){
			i18ninit();
		}
	});
	Details.NewCardLayout = Backbone.Marionette.Layout.extend({
		template: "#set-details-newcard-layout",
		regions: {
			detailsRegion: "#set-newcard-region",
		},
		onRender: function(){
			i18ninit();
		}
	});
	Details.EditCardLayout = Backbone.Marionette.Layout.extend({
		template: "#set-details-editcard-layout",
		regions: {
			detailsRegion: "#set-editcard-region",
		},
		onRender: function(){
			i18ninit();
		}
	});
});
