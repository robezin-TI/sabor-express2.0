cat << 'EOF' > README.md
# 🍴 Sabor Express – Otimizador de Rotas

Aplicação simples para **criar, reorganizar e otimizar rotas de entrega** usando:

- [Leaflet](https://leafletjs.com/) para mapas  
- [OSRM](http://project-osrm.org/) para cálculo de rotas  
- [Nominatim](https://nominatim.org/) para geocodificação de endereços  
- [SortableJS](https://sortablejs.github.io/Sortable/) para reordenar pontos da rota  
- Servido via **Nginx** em um container **Docker**

---

## ⚡ Funcionalidades

✅ Adicionar pontos manualmente ou clicando no mapa  
✅ Ícones A, B, C... personalizados para cada parada  
✅ Lista lateral com drag & drop para reordenar paradas  
✅ Botão para **otimizar rota automaticamente** (via OSRM Trip API)  
✅ Rota exibida no mapa com possibilidade de ajustes  

---

## 🚀 Como rodar localmente

Clone o repositório:

```bash
git clone https://github.com/seu-usuario/sabor-express.git
cd sabor-express
