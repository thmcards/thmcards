Cards.module('Set.Details', function(Details, App) {
	Details.NewCardView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-newcard",
		events: {
			"click .btn-success": "saveCard",
			"click .btn.cancel": "cancel"
		},
		ui: {
			"saveBtn": ".btn-success",
			"cancelBtn": ".btn.cancel"
		},
		cancel: function(ev) {
			history.back();
		},
		saveCard: function(ev) {
			this.ui.saveBtn.button('loading');

			var setId = this.model.get('id');
			var setName = this.model.get('name');

			var card = new Cards.Entities.Card({
				front: $("#front-textarea").val(),
				back: $("#back-textarea").val(),
				setId: setId
			});

			if(card.isValid()) {
				card.save({}, {
					success: function(model, response) {
						Cards.trigger("set:details", setName.replace(/[^a-zA-Z0-9-_]/g, '_'), setId);
					},
					error: function(model, error) {
						this.ui.saveBtn.button('reset');
						alert("something went wrong");
					}
				});
			} else {
				alert('not valid');
				this.ui.saveBtn.button('reset');
			}
		},
		onShow: function() {
			var editorConfig = {
				"font-styles": false,
				"color": false,
				"lists": false
			}

			$("#front-textarea").wysihtml5(editorConfig);
			$("#back-textarea").wysihtml5(editorConfig);
		}
	});
});