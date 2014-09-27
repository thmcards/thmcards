Cards.module('Profile', function(Profile, App){
	Profile.Controller = {
		showLayout: function(username){
			var profileLayout = new Cards.Profile.Layout();
			Cards.mainRegion.show(profileLayout);

			var user = new Cards.Entities.User({username: username});
			user.fetch({
				success: function(user){
					if(username != JSON.parse($.cookie('usr')).username && user.get("profile") === "private") {
						$("#profileName").text(username);
						var privateView = new Cards.Profile.PrivateItemView();
						profileLayout.privateRegion.show(privateView);
					} else {
						var infoView = new Cards.Profile.InfoItemView({ model: user });
						profileLayout.infoRegion.show(infoView);

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

						if(username == JSON.parse($.cookie('usr')).username) {
							var score = new Cards.Entities.Score({username: username});
							score.fetch({
								success: function(){
									var scoreView = new Cards.Profile.ScoreItemView({ model: score });
									profileLayout.scoreRegion.show(scoreView);
								},
								error: function(){

								}
							});
						}

						if(username == JSON.parse($.cookie('usr')).username) {
							var badges = new Cards.Entities.BadgeCollection([], { username:username});
							var badgeView = new Cards.Profile.BadgeView({ collection: badges });
							profileLayout.badgeRegion.show(badgeView);
						}

						if(username != JSON.parse($.cookie('usr')).username) {
							$.get("/set/user/"+username, function(data){
								var setCollection = new Backbone.Collection(data, { model: App.Entities.Set });
								var setView = new Cards.Profile.SetView({ collection: setCollection });
								profileLayout.setRegion.show(setView);

							})
						}
					}
				},
				error: function(){

				}
			});


		},
		onRender: function(){
			i18ninit();
		}
	}
});
