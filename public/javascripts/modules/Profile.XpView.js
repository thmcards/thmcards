Cards.module('Profile', function(Profile, App) {
	Profile.XpItemView = Backbone.Marionette.ItemView.extend({
		template: "#profile-xp-item",
		className: "panel panel-default",
		events: {
			"click a": "linkClicked"
		},
		linkClicked: function(ev){
			ev.preventDefault();

		},
		onRender: function(){
			i18ninit();
		}
	});
});
