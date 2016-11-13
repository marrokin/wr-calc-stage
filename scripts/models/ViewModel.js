// Overall view model for the page
var ViewModel = function () {
    // The base rankings in an object, indexed by the ID of the team.
    this.rankingsById = ko.observable();

    // The base rankings in an array, ordered by points.
    this.baseRankings = ko.observable();

    // The date of the base rankings.
    this.originalDate = ko.observable();

    // The teams from the base rankings, used to populate the lookup.
    // We only need this separate from baseRankings if we want to sort differently.
    this.teams = ko.observableArray();

    // The fixtures used to calculate projected rankings.
    this.fixtures = ko.observableArray();

    // An indication of which set of rankings is displayed.
    // Options are null, 'original' or 'calculated'.
    this.shownRankings = ko.observable();

    // An indication of whether we have loaded fixtures from WR.
    // Not actually used yet, but could help show a loading screen.
    this.fixturesLoaded = ko.observable(false);

    // The rankings calcualted by taking the original rankings and applying
    // the fixtures.
    this.projectedRankings = ko.computed(function() {
        var rankingsById = this.rankingsById();
        var fixtures = this.fixtures();

        // Nothing to calculate if the data has not yet loaded.
        if (!rankingsById || !fixtures) {
            return null;
        }

        // We work on the rankings as we go. Duplicate the base rankings
        // and set the "old" values to the "current" values so we can 
        // show changes at the end.
        var projectedRankings = {};
        $.each(rankingsById, function (k, v) {
            var cr = new RankingViewModel(v);
            cr.previousPos(cr.pos());
            cr.previousPts(cr.pts());
            projectedRankings[v.team.id] = cr;
        });

        // Apply each fixture in turn.
        $.each(fixtures, function (index, fixture) {
            var home = projectedRankings[fixture.homeId()];
            var away = projectedRankings[fixture.awayId()];
            var homeScore = parseInt(fixture.homeScore());
            var awayScore = parseInt(fixture.awayScore());
            var noHome = fixture.noHome();
            var isRwc = fixture.isRwc();

            // Only do anything if the fixture is valid.
            // We should invert the if statement and maybe use the isValid
            // property, although maybe there's a reason we didn't before.
            if (home &&
                away &&
                home != away &&
                !isNaN(homeScore) &&
                !isNaN(awayScore)) {

                // Calculate the effective ranking of the "home" team depending on whether
                // it is really at home.
                var homeRanking = home.pts();
                if (!noHome) {
                    homeRanking = homeRanking + 3;
                }

                // Calculate the ranking diff and cap it at 10 points.
                var rankingDiff = homeRanking - away.pts();
                var cappedDiff = Math.min(10, Math.max(-10, rankingDiff));

                // A draw gives the home team one tenth of the diff.
                var drawChange = cappedDiff / 10;

                // A win gives a team one more point, a loss one less.
                // A win or loss by over 15 multiplies by 1.5.
                var homeChange;
                if (homeScore > awayScore + 15) {
                    homeChange = 1.5 * (1 - drawChange);
                } else if (homeScore > awayScore) {
                    homeChange = 1 - drawChange;
                } else if (homeScore == awayScore) {
                    homeChange = 0 - drawChange;
                } else if (homeScore < awayScore - 15) {
                    homeChange = 1.5 * (-1 - drawChange);
                } else {
                    homeChange = -1 - drawChange;
                }

                // A RWC match doubles the change.
                if (isRwc) {
                    homeChange = homeChange * 2;
                }

                // The rankings are zero-sum, so the away team loses what the home team gains.
                var awayChange = -homeChange;

                // Update the "current" values.
                home.pts(home.pts() + homeChange);
                away.pts(away.pts() + awayChange);
            }
        });

        // Sort the rankings for display and update the "current" positions.
        var sorted = [];
        $.each(projectedRankings, function (i, r) {
            sorted.push(r);
        });
        sorted.sort(function (a, b) { return b.pts() - a.pts(); });
        $.each(sorted, function (i, r) {
            r.pos(i + 1);
        });

        return sorted;
    }, this);

    // Selecting a team.
    this.teamPicker = ko.observable();
    this.selectTeam = function (fixture, isHome) {
        var teamPicker = this.teamPicker;
        var selected = function (id) {
            if (isHome) {
                fixture.homeId(id);
            } else {
                fixture.awayId(id);
            }

            teamPicker(null);
        };
        var cancelled = function () {
            teamPicker(null);
        };

        var vm = new PickerViewModel(
            $.map(this.baseRankings(), function (r) { return r.team; }),
            selected,
            cancelled);
        this.teamPicker(vm);
        $('#teamSelectText').focus();
    };

    return this;
};