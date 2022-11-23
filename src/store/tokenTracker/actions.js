import tokenTracker from "../../utils/token-tracker";
import tokensToTrack from "../../tokensTracked.json";
import teztools from "../../utils/teztools";
import _ from "lodash";
import coingecko from "../../utils/coingecko";

const YESTERDAY = new Date(Date.now() - 86400000).toISOString();
const WEEK_AGO = new Date(Date.now() - 7 * 86400000).toISOString();
const MONTH_AGO = new Date(Date.now() - 30 * 86400000).toISOString();

export default {
  async fetchTokensTracked({ commit, dispatch, state }) {
    if (state.tokenList.length < 1) {
      commit("setTokenList", []);
      dispatch("_setTokenTracked");
    }
  },

  async _setTokenTracked({ commit, state, dispatch }, id) {
    commit("updateLoading", true);
    try {
      const [
        { contracts: priceFeed },
        xtzUsd,
        { quotesTotal: tokenHighAndLow, quotes1dNogaps: tokenVolumes },
      ] = await Promise.all([
        teztools.getPricefeed(),
        coingecko.getXtzUsdPrice(),
        tokenTracker.getQuotes(),
      ]);

      const tokens = [];
      for (let i = 0; i < tokensToTrack.length; i++) {
        const value = tokensToTrack[i];
        const tokenData = value;
        const token = await tokenTracker.calculateTokenData(
          tokenData,
          priceFeed,
          xtzUsd,
          tokenHighAndLow,
          tokenVolumes
        );

        if (token) {
          tokens.push({
            id: `${value.tokenAddress}_${value.tokenId || 0}`,
            ...token,
          });
        }
      }
      await dispatch("sortTokensTracked", tokens);
    } catch (error) {
      console.log(error);
    } finally {
      if (id) {
        const token = state.tokensTracked[id];
        if (token) {
          commit("updateTokenOverview", token || {});
          dispatch("fetchChartData", token.id);
        }
      }
      commit("updateLoading", false);
    }
  },

  async sortTokensTracked({ commit, state }, tokens) {
    const orderedTokens = _.orderBy(tokens, ["mktCap"], ["desc"]);
    for (let index = 0; index < orderedTokens.length; index++) {
      const token = orderedTokens[index];
      token.order = index + 1;
      // orderedTokens[index].order = index + 1;
      commit("updateTokenTracked", token);
      commit("updateTokenList", token);
    }
  },

  async fetchTokenTrackedWithId({ state, commit, dispatch }, id) {
    commit("updateLoadingOverview", true);
    try {
      if (state.tokenList.length < 1) {
        dispatch("_setTokenTracked", id);
      } else {
        const token = state.tokensTracked[id];
        if (token) {
          commit("updateTokenOverview", token || {});
          dispatch("fetchChartData", token.id);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      commit("updateLoadingOverview", false);
    }
  },

  async fetchChartData({ commit }, tokenId) {
    commit("updateChartDataLoading", true);
    const chartData = {};
    try {
      const [
        volumeAndPrice1Day,
        volumeAndPrice7Day,
        volumeAndPrice30Day,
        tvl1Day,
        tvl7Day,
        tvl30Day,
      ] = await Promise.all([
        tokenTracker.getQuotes15mNogaps(tokenId, YESTERDAY),
        tokenTracker.getQuotes1dNogaps(tokenId, WEEK_AGO),
        tokenTracker.getQuotes1dNogaps(tokenId, MONTH_AGO),
        tokenTracker.getActivity(tokenId, YESTERDAY),
        tokenTracker.getActivity(tokenId, WEEK_AGO),
        tokenTracker.getActivity(tokenId, MONTH_AGO),
      ]);

      chartData.volumeAndPrice1Day = volumeAndPrice1Day;
      chartData.volumeAndPrice7Day = volumeAndPrice7Day;
      chartData.volumeAndPrice30Day = volumeAndPrice30Day;
      chartData.tvl1Day = tvl1Day;
      chartData.tvl7Day = tvl7Day;
      chartData.tvl30Day = tvl30Day;
      console.log("========== \n =========", chartData);
      commit("updateChartData", chartData);
    } catch (error) {
      console.log(error);
    } finally {
      commit("updateChartDataLoading", false);
    }
  },
};
