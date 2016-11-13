//View model for picking a team.
var PickerViewModel = function (teams, selected, cancelled) {
    this.teams = teams;

    // Input string to filter teams.
    this.selectTeamFilter = ko.observable('');

    // Test to see whether a team matches the filter.
    this.selectTeamTest = ko.computed(function () {
        var selectTeamFilter = this.selectTeamFilter();
        try
        {
            var re = new RegExp(selectTeamFilter, 'i');
            return function (team) { return re.test(team.name); };
        }
        catch (e)
        {
            selectTeamFilter = selectTeamFilter.toLowerCase();
            return function (team) { return team.name.toLowerCase().indexOf(selectTeamFilter) > -1 }; 
        }
    }, this);

    // Array of teams that match the filter.
    this.filteredTeams = ko.computed(function () {
        var test = this.selectTeamTest();
        return $.grep(this.teams, function (t) { return test(t); });
    }, this);

    // Handler when a team is selected.
    this.teamSelected = function (team) {
        selected(team.id);
    };

    // Handler when selection is cancelled.
    this.cancelled = function () { cancelled(); };
};