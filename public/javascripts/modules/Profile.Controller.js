Cards.module('Profile', function(Profile, App){
	Profile.Controller = {
		showLayout: function(username){
			var profileLayout = new Cards.Profile.Layout();
			Cards.mainRegion.show(profileLayout);

			var user = new Cards.Entities.User({username: username});

			user.fetch({
				success: function(){
					var infoView = new Cards.Profile.Info.InfoItemView({ model: user });
					profileLayout.infoRegion.show(infoView);
				},
				error: function(){

				}
			});
		}
	}
});