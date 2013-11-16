Cards.module('Profile', function(Profile, App){
	Profile.Controller = {
		showLayout: function(username){
			var profileLayout = new Cards.Profile.Layout();
			Cards.mainRegion.show(profileLayout);

			var user = new Cards.Entities.User({username: username});
			user.fetch({
				success: function(){
					var infoView = new Cards.Profile.InfoItemView({ model: user });
					profileLayout.infoRegion.show(infoView);
				},
				error: function(){

				}
			});

			var xpModel = new Backbone.Model({}, {
				url: 'xp/'+username
			}).fetch({
				success: function(model){
					var xpView = new Cards.Profile.XpItemView({ model: model });
					profileLayout.xpRegion.show(xpView);
				},
				error: function(){

				}
			});

			var score = new Cards.Entities.Score({username: username});
			score.fetch({
				success: function(){
					var scoreView = new Cards.Profile.ScoreItemView({ model: score });
					profileLayout.scoreRegion.show(scoreView);
				},
				error: function(){

				}
			});

			var badges = new Cards.Entities.BadgeCollection([], { username:username});
			var badgeView = new Cards.Profile.BadgeView({ collection: badges });
			profileLayout.badgeRegion.show(badgeView);
		}
	}
});