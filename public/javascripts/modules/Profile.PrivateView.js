Cards.module('Profile', function(Profile, App) {
	Profile.PrivateItemView = Backbone.Marionette.ItemView.extend({
		template: "#profile-private-item",
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
