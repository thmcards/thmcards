Cards.module('Pool', function(Pool, App) {
	Pool.Layout = Backbone.Marionette.Layout.extend({
		template: "#pool-category-layout",
		regions: {
			categoryRegion: "#pool-category-region"
		},
		onRender: function(){
			i18ninit();

			$("#navbar").children().removeClass("active");
			$("#navbar-pool").addClass("active");
		}
	});

});
