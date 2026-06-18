<template>
  <div class="modal-overlay">
    <div class="modal-box invoice-gen-box animate-zoom">
      <div class="modal-header">
        <h3><i class="fi fi-bs-file-invoice-dollar"></i> Émission & Génération de Facture</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <div class="form-row">
          <div class="form-group flex-1">
            <label>Numéro de facture :</label>
            <input type="text" class="form-control" v-model="invoiceId" placeholder="FAC-2026-X" />
          </div>
          <div class="form-group flex-2">
            <label>Sélectionner l'Entreprise :</label>
            <select class="form-select" v-model="clientId" @change="onClientChange">
              <option value="" disabled>-- Sélectionner une entreprise --</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">
                {{ c.nom }} ({{ c.email }})
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Modèle de facture (Charte graphique) :</label>
            <select class="form-select" v-model="selectedTemplateId">
              <option v-for="t in templates" :key="t.id" :value="t.id">
                {{ t.nom }} ({{ formaterLayoutType(t.layout_type) }})
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Date d'émission :</label>
            <input type="date" class="form-control" v-model="dateEmission" />
          </div>
          <div class="form-group flex-1">
            <label>Date d'échéance :</label>
            <input type="date" class="form-control" v-model="dateEcheance" />
          </div>
        </div>

        <hr class="separator" />

        <div class="items-section">
          <div class="items-header">
            <h4>Lignes de facturation</h4>
            <button class="btn btn-secondary btn-sm" @click="ajouterLigne">
              <i class="fi fi-bs-plus"></i> Ajouter une ligne
            </button>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Désignation / Description</th>
                <th width="80">Qté</th>
                <th width="120">Prix Unitaire HT (€)</th>
                <th width="100">Total HT (€)</th>
                <th width="50"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in items" :key="index">
                <td>
                  <input type="text" class="form-control" v-model="item.description" placeholder="Prestation de service..." />
                </td>
                <td>
                  <input type="number" class="form-control text-center" v-model.number="item.quantity" min="1" @input="calculerTotaux" />
                </td>
                <td>
                  <input type="number" class="form-control text-right" v-model.number="item.price" min="0" step="0.01" @input="calculerTotaux" />
                </td>
                <td class="item-total-cell">
                  {{ formaterMontant(item.quantity * item.price) }}
                </td>
                <td class="text-center">
                  <button class="btn-delete" @click="supprimerLigne(index)" :disabled="items.length <= 1">
                    &times;
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="summary-section">
          <div class="summary-card">
            <div class="summary-row">
              <span>Sous-total HT :</span>
              <strong>{{ formaterMontant(subtotal) }}</strong>
            </div>
            <div class="summary-row">
              <span>TVA (20%) :</span>
              <strong>{{ formaterMontant(tva) }}</strong>
            </div>
            <hr />
            <div class="summary-row total-row">
              <span>Total TTC :</span>
              <strong>{{ formaterMontant(total) }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Annuler</button>
        <button class="btn btn-success" @click="genererEtEnregistrer" :disabled="!clientId || !invoiceId">
          <i class="fi fi-bs-check"></i> Générer PDF & Enregistrer
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { clients, ajouterFacture, templates } from '../utils/store.js';

export default {
  name: 'InvoiceGenerator',
  emits: ['close', 'success'],
  setup(props, { emit }) {
    const invoiceId = ref(`FAC-2026-${Math.floor(100 + Math.random() * 900)}`);
    const clientId = ref('');
    const selectedClient = ref(null);
    const dateEmission = ref(new Date().toISOString().split('T')[0]);
    const dateEcheance = ref(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const items = ref([
      { description: '', quantity: 1, price: 0 }
    ]);

    const subtotal = ref(0);
    const tva = ref(0);
    const total = ref(0);

    const selectedTemplateId = ref('');

    const formaterLayoutType = (type) => {
      switch (type) {
        case 'colored_header': return 'En-tête coloré';
        case 'minimalist': return 'Minimaliste épuré';
        case 'bold_accent': return 'Ligne d\'accentuation';
        default: return type;
      }
    };

    onMounted(() => {
      if (templates.value && templates.value.length > 0) {
        selectedTemplateId.value = templates.value[0].id;
      }
    });

    const onClientChange = () => {
      selectedClient.value = clients.value.find(c => c.id === clientId.value) || null;
    };

    const ajouterLigne = () => {
      items.value.push({ description: '', quantity: 1, price: 0 });
      calculerTotaux();
    };

    const supprimerLigne = (index) => {
      if (items.value.length > 1) {
        items.value.splice(index, 1);
        calculerTotaux();
      }
    };

    const calculerTotaux = () => {
      let tempSubtotal = 0;
      items.value.forEach(item => {
        const qty = Number(item.quantity) || 0;
        const prc = Number(item.price) || 0;
        tempSubtotal += qty * prc;
      });

      subtotal.value = tempSubtotal;
      tva.value = tempSubtotal * 0.20;
      total.value = tempSubtotal * 1.20;
    };

    const formaterMontant = (m) => {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(m);
    };

    const formaterDate = (d) => {
      return new Date(d).toLocaleDateString('fr-FR');
    };

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 67, g: 56, b: 202 }; // Default Indigo
    };

    const genererEtEnregistrer = () => {
      if (!selectedClient.value || !invoiceId.value) return;

      try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
          throw new Error("jsPDF n'est pas chargé sur la page.");
        }

        const doc = new jsPDF();

        // Trouver le modèle sélectionné
        const tpl = templates.value.find(t => t.id === selectedTemplateId.value) || {
          nom: 'Standard',
          primary_color: '#4338ca',
          layout_type: 'colored_header',
          footer_text: 'Merci pour votre confiance. Facture payable par virement bancaire.',
          logo_base64: null
        };

        const primaryRgb = hexToRgb(tpl.primary_color);

        // 1. Dessiner l'en-tête selon le layout choisi
        if (tpl.layout_type === 'minimalist') {
          // Minimaliste : Blanc avec logo et titre coloré
          doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
          doc.setFontSize(22);
          doc.text("RelanceFacture", 15, 25);
          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128);
          doc.text("Service de Facturation", 15, 32);

          doc.setDrawColor(229, 231, 235);
          doc.line(15, 42, 195, 42);
        } else if (tpl.layout_type === 'bold_accent') {
          // Bold Accent : Blanc avec titre foncé, logo, et ligne d'accent colorée épaisse
          doc.setTextColor(17, 24, 39);
          doc.setFontSize(22);
          doc.text("RelanceFacture", 15, 25);
          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128);
          doc.text("Service de Facturation", 15, 32);

          doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
          doc.setLineWidth(3);
          doc.line(15, 41, 195, 41);
          doc.setLineWidth(1); // Reset line width
        } else {
          // Colored Header (Défaut) : Rect coloré et texte blanc
          doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
          doc.rect(0, 0, 210, 42, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(22);
          doc.text("RelanceFacture", 15, 25);
          doc.setFontSize(10);
          doc.text("Service de Facturation Automatise", 15, 32);
        }

        // Ajouter le logo si présent
        if (tpl.logo_base64) {
          try {
            let format = 'PNG';
            if (tpl.logo_base64.includes('image/jpeg') || tpl.logo_base64.includes('image/jpg')) {
              format = 'JPEG';
            }
            doc.addImage(tpl.logo_base64, format, 160, 10, 35, 22);
          } catch (err) {
            console.warn("Could not render logo in PDF:", err);
          }
        }

        // 2. Métadonnées Facture (Gauche)
        doc.setTextColor(17, 24, 39); 
        doc.setFontSize(13);
        doc.text("FACTURE", 15, 58);
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(`Reference : ${invoiceId.value}`, 15, 66);
        doc.text(`Date d'emission : ${formaterDate(dateEmission.value)}`, 15, 72);
        doc.text(`Date d'echeance : ${formaterDate(dateEcheance.value)}`, 15, 78);

        // 3. Infos Client (Droite)
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(11);
        doc.text("DESTINATAIRE :", 120, 58);
        doc.setFontSize(10);
        doc.text(selectedClient.value.nom, 120, 66);
        doc.setTextColor(107, 114, 128);
        doc.text(selectedClient.value.email, 120, 72);

        // 4. Lignes de Facture - Header du tableau
        doc.setFillColor(243, 244, 246);
        doc.rect(15, 92, 180, 8, 'F');
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.text("Description", 18, 97);
        doc.text("Qte", 115, 97);
        doc.text("Prix U. HT", 135, 97);
        doc.text("Total HT", 165, 97);

        // Lignes du tableau
        let y = 108;
        items.value.forEach(item => {
          doc.setTextColor(17, 24, 39);
          doc.text(item.description || 'Prestation de service', 18, y);
          doc.text(String(item.quantity), 115, y);
          doc.text(`${Number(item.price).toFixed(2)} EUR`, 135, y);
          doc.text(`${(item.quantity * item.price).toFixed(2)} EUR`, 165, y);
          
          doc.setDrawColor(229, 231, 235);
          doc.line(15, y + 4, 195, y + 4);
          y += 12;
        });

        // 5. Total section
        y += 8;
        doc.setTextColor(75, 85, 99);
        doc.setFontSize(9);
        doc.text("Sous-total HT :", 135, y);
        doc.text(`${subtotal.value.toFixed(2)} EUR`, 165, y);

        doc.text("TVA (20%) :", 135, y + 6);
        doc.text(`${tva.value.toFixed(2)} EUR`, 165, y + 6);

        doc.setFontSize(11);
        doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b); // Accent color
        doc.text("Total TTC :", 135, y + 14);
        doc.text(`${total.value.toFixed(2)} EUR`, 165, y + 14);

        // 6. Bas de page / Mentions
        doc.setTextColor(156, 163, 175);
        doc.setFontSize(8);
        const splitFooter = doc.splitTextToSize(tpl.footer_text || '', 180);
        doc.text(splitFooter, 15, 274);
        doc.text("RelanceFacture MVP - Prevention des retards de paiement.", 15, 282);

        // Export base64 URI
        const pdfBase64 = doc.output('datauristring');

        // Créer la facture dans le store
        const facturePayload = {
          id_facture: invoiceId.value,
          nom_client: selectedClient.value.nom,
          email_client: selectedClient.value.email,
          montant: total.value,
          date_emission: dateEmission.value,
          date_echeance: dateEcheance.value,
          statut_paiement: "En attente",
          pdf_content: pdfBase64
        };

        ajouterFacture(facturePayload);
        emit('success');
      } catch (err) {
        console.error("Erreur lors de la génération PDF :", err);
        alert("Une erreur s'est produite lors de la génération de la facture.");
      }
    };

    return {
      invoiceId,
      clientId,
      dateEmission,
      dateEcheance,
      items,
      subtotal,
      tva,
      total,
      clients,
      onClientChange,
      ajouterLigne,
      supprimerLigne,
      calculerTotaux,
      formaterMontant,
      genererEtEnregistrer,
      templates,
      selectedTemplateId,
      formaterLayoutType
    };
  }
};
</script>

<style scoped>
.invoice-gen-box {
  max-width: 800px !important;
  width: 90% !important;
}

.separator {
  border: 0;
  border-top: 1px solid var(--border-glass);
  margin: 1.5rem 0;
}

.items-section {
  margin-top: 1rem;
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.items-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th {
  text-align: left;
  padding: 0.5rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  border-bottom: 2px solid var(--border-glass);
}

.items-table td {
  padding: 0.5rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--border-glass);
}

.item-total-cell {
  font-weight: 600;
  color: var(--text-main);
  text-align: right;
  padding-right: 0.8rem !important;
}

.btn-delete {
  background: none;
  border: none;
  color: var(--danger-color);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.btn-delete:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.summary-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.summary-card {
  background: var(--bg-dark);
  padding: 1.2rem;
  border-radius: 12px;
  width: 320px;
  border: 1px solid var(--border-glass);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.summary-row hr {
  border: 0;
  border-top: 1px solid var(--border-glass);
  margin: 0.5rem 0;
}

.total-row {
  font-size: 1.1rem;
  color: var(--primary-color);
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

/* Styles de Modal & Formulaires copiés depuis InvoicesView.vue pour cohérence visuelle */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.modal-box {
  width: 90%;
  max-width: 650px;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid var(--border-glass);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-glass);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-glass);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
}

.form-control {
  width: 100%;
  background: #ffffff;
  border: 1px solid #D1D5DB;
  color: #111827;
  font-weight: 500;
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.form-control::placeholder {
  color: #9CA3AF;
  font-weight: 400;
}

.form-control:focus {
  outline: none;
  border-color: #6366f1;
}

.form-select {
  width: 100%;
  background: #ffffff;
  border: 1px solid #D1D5DB;
  color: #111827;
  font-weight: 500;
  padding: 0.65rem 0.8rem;
  border-radius: 8px;
  box-sizing: border-box;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

/* Boutons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.btn-secondary {
  background: #ffffff;
  color: var(--text-main);
  border: 1px solid var(--border-glass);
}

.btn-secondary:hover {
  background: rgba(15, 23, 42, 0.04);
}

.btn-success {
  background: var(--success-color);
  color: white;
}

.btn-success:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.animate-zoom {
  animation: zoom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes zoom {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
