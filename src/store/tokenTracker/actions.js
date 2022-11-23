import tokenTracker from "../../utils/token-tracker";
import tokensToTrack from "../../tokensTracked.json";
import teztools from "../../utils/teztools";
import _ from "lodash";
import coingecko from "../../utils/coingecko";

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
      const [{ contracts: priceFeed }, xtzUsd, tokenHighAndLow] =
        await Promise.all([
          teztools.getPricefeed(),
          coingecko.getXtzUsdPrice(),
          tokenTracker.getTokenHighAndLow(),
        ]);

      const tokens = [];
      for (let i = 0; i < tokensToTrack.length; i++) {
        const value = tokensToTrack[i];
        const tokenData = value;
        const token = await tokenTracker.calculateTokenData(
          tokenData,
          priceFeed,
          xtzUsd,
          tokenHighAndLow
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
        commit("updateTokenOverview", token || {});
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
        commit("updateTokenOverview", token || {});
      }
    } catch (error) {
      console.log(error);
    } finally {
      commit("updateLoadingOverview", false);
    }
  },
};
