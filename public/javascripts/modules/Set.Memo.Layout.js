Cards.module('Set.Memo', function(Memo, App) {
	Memo.Layout = Backbone.Marionette.Layout.extend({
		template: "#set-memo-layout",
		regions: {
			detailsRegion: "#set-memo-region"
		},
		onRender: function(){
			i18ninit();
		}
	});
});
