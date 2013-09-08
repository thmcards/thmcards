Cards.module('Profile', function(Profile, App) {
	Profile.ScoreItemView = Backbone.Marionette.ItemView.extend({
		template: "#profile-score-item",
		className: "panel panel-info",
		events: {
			"click a": "linkClicked"
		}
	});
});