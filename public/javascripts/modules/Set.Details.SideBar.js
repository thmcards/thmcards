Cards.module("Set.Details.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-sideBar",
		className: "well well-sm sidebar-nav",
		ui: {


		}
	}),
	SideBar.ControlsView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-controls",
		className: "well well-sm sidebar-nav",
		ui: {
			btnAdd: "a.saveSet", 
			inputSetName: "input[type=text]",
			modalView: "#editSetModal",
			modalBtnSave: "#editSetModal button.btn-primary",
			modalBtnDelete: "#editSetModal button.btn-delete",
			modalInputName: "#editSetName",
			modalInputDescription: "#editSetDescription",
			modalInputCategory: "#editSetCategory"

		},
		events: {
			"click .newCard": "newCardClicked",
			"click .editSet": "showEditSetModal",
			"click #editSetModal button.btn-primary": "updateSet",
			"click #editSetModal button.btn-delete": "deleteSet"
		},
		newCardClicked: function(ev) {
			App.trigger("set:details:new", this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("_id"));
		},
		showEditSetModal: function() {
			var that = this;

			this.ui.modalInputName.val(this.model.get("name"));
			this.ui.modalInputDescription.val(this.model.get("description"));
			this.ui.modalInputCategory.val(this.model.get("category"));
			
			if (this.model.get("visibility") === "public") {
					$("#editSetModal .btn-group > label.private").removeClass("active");
					$("#editSetModal .btn-group > label.public").addClass("active");
			}

			this.ui.modalView.on('hidden.bs.modal', function() {
				that.ui.modalBtnSave.button('reset');
				that.ui.modalInputName.val('');
				that.ui.modalInputDescription.val('');
			})
			this.ui.modalView.modal('show');
		},
		updateSet: function(ev) {
			var that = this;
			console.log("updaaaate");

			this.ui.modalBtnSave.button('loading');

			var name = this.ui.modalInputName.val();
			var description = this.ui.modalInputDescription.val();
			var category = this.ui.modalInputCategory.val();
			var visibility = $("#editSetModal .btn-group > label.active > input").val();

			this.model.save({name: name, description: description, visibility: visibility, category: category}, {
			    wait : true,    // waits for server to respond with 200 before adding newly created model to collection

			    success : function(resp){
			        that.ui.modalView.modal('hide');
			    },
			    error : function(err) {
			    	that.ui.modalBtnSave.button('reset');
			        console.log('error callback');
			        // this error message for dev only
			        alert('There was an error. See console for details');
			        console.log(err);
				}
			});
		},
		deleteSet: function(ev) {

			var that = this;

			this.ui.modalBtnDelete.button('loading');

			this.model.destroy({

			    success : function(resp){
			        that.ui.modalView.modal('hide');
					that.ui.modalView.on('hidden.bs.modal', function() {
					        App.trigger("set:list");
					})
			    },
			    error : function(err) {
			    	that.ui.modalBtnDelete.button('reset');
			        console.log('error callback');
			        // this error message for dev only
			        alert('There was an error. See console for details');
			        console.log(err);
				}
			});
		}
	});
});