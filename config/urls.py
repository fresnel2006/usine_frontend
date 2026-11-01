from django.urls import include, path

urlpatterns = [
    path("", include("usine.urls")),
]

handler403 = "usine.views.erreurs.acces_refuse"
handler404 = "usine.views.erreurs.page_introuvable"
