const input = document.getElementById("pokemonInput");
const button = document.getElementById("searchBtn");
const statusText = document.getElementById("status");
const result = document.getElementById("result");
let pendingRevealData = null;

async function getPokemon(name) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
  if (!response.ok) {
    throw new Error("Pokemon no encontrado");
  }
  return response.json();
}

async function getAbility(abilityName) {
  const response = await fetch(`https://pokeapi.co/api/v2/ability/${abilityName}`);
  if (!response.ok) {
    throw new Error("No se pudo cargar habilidad");
  }
  return response.json();
}

async function getEvolutionChain(speciesUrl) {
  const speciesResponse = await fetch(speciesUrl);
  if (!speciesResponse.ok) {
    throw new Error("No se pudo cargar especie");
  }
  const speciesData = await speciesResponse.json();

  const evolutionResponse = await fetch(speciesData.evolution_chain.url);
  if (!evolutionResponse.ok) {
    throw new Error("No se pudo cargar evolución");
  }
  return evolutionResponse.json();
}

function extractEvolutionNames(chainNode, names = []) {
  names.push(chainNode.species.name);
  chainNode.evolves_to.forEach((nextNode) => extractEvolutionNames(nextNode, names));
  return names;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderPokeballReveal(pokemonName) {
  result.innerHTML = `
    <section class="pokeball-stage">
      <p class="pokeball-message">¡Pokemon encontrado! Presiona la pokebola para revelarlo.</p>
      <button id="revealBtn" class="pokeball-button" type="button" aria-label="Abrir pokebola">
        <span class="pokeball-half pokeball-top"></span>
        <span class="pokeball-half pokeball-bottom"></span>
        <span class="pokeball-band"></span>
        <span class="pokeball-center"></span>
      </button>
      <p class="pokeball-name">Buscando a: <strong>${capitalize(pokemonName)}</strong></p>
    </section>
  `;

  const revealBtn = document.getElementById("revealBtn");
  revealBtn.addEventListener("click", () => {
    if (!pendingRevealData || revealBtn.classList.contains("opening")) {
      return;
    }

    revealBtn.classList.add("opening");
    statusText.className = "loading";
    statusText.textContent = "La pokebola se esta abriendo...";

    setTimeout(() => {
      const { pokemon, abilityData, evolutionData } = pendingRevealData;
      renderPokemon(pokemon, abilityData, evolutionData);
      statusText.textContent = "";
      statusText.className = "";
      pendingRevealData = null;
    }, 900);
  });
}

function renderPokemon(pokemonData, abilityData, evolutionData) {
  const types = pokemonData.types.map((item) => item.type.name).join(", ");
  const abilities = pokemonData.abilities.map((item) => item.ability.name).join(", ");
  const evolutionNames = extractEvolutionNames(evolutionData.chain).join(" -> ");
  const hpStat = pokemonData.stats.find((item) => item.stat.name === "hp")?.base_stat || "N/A";
  const mainType = pokemonData.types[0]?.type?.name || "normal";
  const sprite =
    pokemonData.sprites.other["official-artwork"].front_default ||
    pokemonData.sprites.front_default;

  const effectInSpanish = abilityData.effect_entries.find((entry) => entry.language.name === "es");
  const effectInEnglish = abilityData.effect_entries.find((entry) => entry.language.name === "en");
  const mainEffect = effectInSpanish?.short_effect || effectInEnglish?.short_effect || "Sin descripción disponible";

  result.innerHTML = `
    <article class="tcg-card type-${mainType}">
      <div class="tcg-inner">
        <div class="tcg-top">
          <span class="tcg-basic">BASIC</span>
          <h2>${capitalize(pokemonData.name)}</h2>
          <div class="tcg-hp">HP ${hpStat}</div>
        </div>

        <div class="tcg-image-frame">
          <img src="${sprite}" alt="${pokemonData.name}" />
        </div>

        <p class="tcg-meta">
          No. ${String(pokemonData.id).padStart(3, "0")} | Tipo ${capitalize(mainType)} | Peso ${pokemonData.weight}
        </p>

        <div class="tcg-attack-box">
          <h3>${capitalize(pokemonData.abilities[0]?.ability?.name || "Ataque principal")}</h3>
          <p>${mainEffect}</p>
        </div>

        <div class="tcg-attack-box">
          <h3>Evolucion</h3>
          <p>${evolutionNames}</p>
        </div>

        <div class="tcg-footer">
          <p><strong>Nombre:</strong> ${pokemonData.name}</p>
          <p><strong>Tipos:</strong> ${types}</p>
          <p><strong>Habilidades:</strong> ${abilities}</p>
        </div>
      </div>
    </article>
  `;
}

async function searchPokemon() {
  const query = input.value.trim();
  if (!query) {
    statusText.textContent = "Escribe un nombre de Pokémon.";
    statusText.className = "error";
    result.innerHTML = "";
    return;
  }

  statusText.className = "loading";
  statusText.textContent = "Cargando datos...";
  result.innerHTML = "";
  pendingRevealData = null;

  try {
    const pokemon = await getPokemon(query);
    const firstAbility = pokemon.abilities[0]?.ability?.name || "overgrow";

    const [abilityData, evolutionData] = await Promise.all([
      getAbility(firstAbility),
      getEvolutionChain(pokemon.species.url),
    ]);

    pendingRevealData = {
      pokemon,
      abilityData,
      evolutionData,
    };

    renderPokeballReveal(pokemon.name);
    statusText.textContent = "";
    statusText.className = "";
  } catch (error) {
    statusText.textContent = error.message;
    statusText.className = "error";
    result.innerHTML = "";
  }
}

button.addEventListener("click", searchPokemon);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchPokemon();
  }
});