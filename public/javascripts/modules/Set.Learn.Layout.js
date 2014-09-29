Cards.module('Set.Learn', function(Learn, App) {
	Learn.Layout = Backbone.Marionette.Layout.extend({
		template: "#set-learn-layout",
		regions: {
			learnRegion: "#set-learn-region",
			sideBarRegion: "#set-learn-sideBar-region",
			controlsRegion: "#set-learn-controls-region",
		},
		onRender: function(){
			i18ninit();
		}
	});
});
