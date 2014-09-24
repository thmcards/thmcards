Cards.module('Profile', function(Profile, App) {
	Profile.ScoreItemView = Backbone.Marionette.ItemView.extend({
		template: "#profile-score-item",
		className: "panel panel-default",
		events: {
			"click a": "linkClicked",
			"click a.set-link": "setClicked"
		},
		setClicked: function(ev) {
			ev.preventDefault();

			var setId = $(ev.currentTarget).attr("data-set-id");
			var setName = $(ev.currentTarget).text();

			App.trigger("set:details", setName, setId);
		},
		onRender: function(){
			i18ninit();
		}

	});
});
