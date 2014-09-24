Cards.module('Set.List', function(List, App) {
	List.Layout = Backbone.Marionette.Layout.extend({
		template: "#set-list-layout",
		regions: {
			sideBarRegion: "#set-list-sideBar-region",
			listRegion: "#set-list-region"
		},
		onRender: function(){
			$("#navbar").children().removeClass("active");
			$("#navbar-ownsets").addClass("active");

			i18ninit();
		}
	});

});
